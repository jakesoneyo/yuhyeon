import { execSync } from 'child_process';
import path from 'path';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { createHmac } from 'crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * 실제 Postgres 컨테이너(Testcontainers)로 dedup CTE의 **원자성**을 증명한다.
 * 애플리케이션 락이 아니라 `INSERT ... ON CONFLICT DO NOTHING` 단일 문이 동시성을 보장하는지가
 * 이 프로젝트의 핵심 주장(SPEC.md §1)이므로, 같은 idempotencyKey로 병렬 N개 요청을 보내
 * 정확히 1건만 적재되는지 검증한다. 별도의 애플리케이션 레벨 뮤텍스/락은 전혀 사용하지 않는다.
 *
 * 회원가입 → 로그인 → 현장 조회 흐름도 같은 컨테이너에서 함께 검증해 "사람 경계" 전체를 커버한다.
 */
describe('Ingest concurrency & auth flow (Testcontainers Postgres, e2e)', () => {
  jest.setTimeout(180_000);

  let container: StartedPostgreSqlContainer;
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const apiKey = 'testcontainer-api-key';
  const hmacSecret = 'testcontainer-hmac-secret';
  // Jest는 같은 워커 안에서 다음 e2e 파일이 이어 실행될 때 process.env를 리셋하지 않으므로,
  // 컨테이너가 내려간 뒤 다른 스펙이 이 임시 DATABASE_URL 등을 물려받지 않도록 원복한다.
  const originalEnv = { ...process.env };

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('yuhyeon_test')
      .withUsername('yuhyeon_test')
      .withPassword('yuhyeon_test')
      .start();

    const databaseUrl = container.getConnectionUri();
    process.env.DATABASE_URL = databaseUrl;
    process.env.AGENT_API_KEY = apiKey;
    process.env.AGENT_HMAC_SECRET = hmacSecret;
    process.env.ALLOWED_AGENT_ID = '';
    process.env.JWT_SECRET = 'testcontainer-jwt-secret';

    // 컨테이너는 빈 DB이므로 Prisma migrate로 스키마를 만든다(런타임 DDL 없음 — DATA-MODEL.md §5).
    execSync('npx prisma migrate deploy', {
      cwd: path.resolve(__dirname, '..'),
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: 'inherit',
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
    await container.stop();
    process.env = originalEnv;
  });

  function sign(idempotencyKey: string, occurredAt: string, rawLine: string) {
    return createHmac('sha256', hmacSecret)
      .update(`${idempotencyKey}:${occurredAt}:${rawLine}`)
      .digest('hex');
  }

  it('같은 idempotencyKey로 동시에 20개 요청을 보내도 정확히 1건만 적재된다', async () => {
    const idempotencyKey = `concurrency-key-${Date.now()}`;
    const occurredAt = new Date().toISOString();
    const rawLine = 'PPV-01,3.5,mm/s';
    const signature = sign(idempotencyKey, occurredAt, rawLine);

    const body = {
      siteId: 'site-concurrency',
      agentId: 'field-pc-concurrency',
      sourceFile: 'C:/logs/concurrency.txt',
      offset: 1,
      occurredAt,
      rawLine,
      idempotencyKey,
      signature,
    };

    const CONCURRENT_REQUESTS = 20;
    // Promise.all로 완전히 겹치게 발사 — 애플리케이션 락 없이 DB CTE만으로 경합을 해소해야 한다.
    const responses = await Promise.all(
      Array.from({ length: CONCURRENT_REQUESTS }, () =>
        request(app.getHttpServer())
          .post('/api/ingest')
          .set('x-api-key', apiKey)
          .send(body),
      ),
    );

    const accepted = responses.filter((res) => res.status === 201);
    const duplicate = responses.filter((res) => res.status === 200);

    expect(accepted).toHaveLength(1);
    expect(duplicate).toHaveLength(CONCURRENT_REQUESTS - 1);
    expect((accepted[0].body as { status: string }).status).toBe('accepted');

    const count = await prisma.rawLog.count({ where: { idempotencyKey } });
    expect(count).toBe(1); // 원자성 증명: 병렬 요청에도 raw_logs는 정확히 1행
  });

  it('회원가입 → 로그인 → 현장 조회(JWT) 전체 흐름이 정상 동작한다', async () => {
    const username = 'flow-user@example.com';
    const password = 'password123';

    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ username, password })
      .expect(201);

    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username, password })
      .expect(200);
    const { accessToken } = loginRes.body as { accessToken: string };
    expect(typeof accessToken).toBe('string');

    await request(app.getHttpServer()).get('/api/sites').expect(401); // 무토큰이면 여전히 401

    await request(app.getHttpServer())
      .get('/api/sites')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
  });
});
