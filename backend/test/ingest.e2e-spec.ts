import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createHmac } from 'crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * 수집 파이프라인 e2e — 실제 Postgres(로컬 docker-compose)에 대해 HMAC 서명 → dedup → 적재를 검증한다.
 * DATABASE_URL이 가리키는 DB에 직접 raw_logs/ingest_dedup을 씁니다(테스트 전용 DB를 권장).
 */
describe('Ingest API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let agentId: string;

  const apiKey = process.env.AGENT_API_KEY ?? 'api';
  const hmacSecret = process.env.AGENT_HMAC_SECRET ?? 'hmac';

  beforeAll(async () => {
    process.env.AGENT_API_KEY = apiKey;
    process.env.AGENT_HMAC_SECRET = hmacSecret;

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
    // Prisma가 클라이언트 생성 시 .env를 다시 읽어들이므로, 위에서 세팅한 process.env 값이
    // 여기서(app.init 이후) 되돌아올 수 있다 — ALLOWED_AGENT_ID가 설정돼 있으면 그 값을 그대로 써서
    // "화이트리스트에 등록된 agentId"로 요청하고, 없으면 임의 agentId를 쓴다.
    agentId = process.env.ALLOWED_AGENT_ID || 'field-pc-e2e';
  });

  afterAll(async () => {
    await app.close();
  });

  function sign(idempotencyKey: string, occurredAt: string, rawLine: string) {
    return createHmac('sha256', hmacSecret)
      .update(`${idempotencyKey}:${occurredAt}:${rawLine}`)
      .digest('hex');
  }

  it('accepts a new record (201) and reports duplicate on resend (200, no re-insert)', async () => {
    const idempotencyKey = `e2e-key-${Date.now()}`;
    const occurredAt = new Date().toISOString();
    const rawLine = 'INC-04,14.28,mm';
    const signature = sign(idempotencyKey, occurredAt, rawLine);

    const body = {
      siteId: 'site-e2e',
      agentId,
      sourceFile: 'C:/logs/e2e.txt',
      offset: 1,
      occurredAt,
      rawLine,
      idempotencyKey,
      signature,
    };

    const first = await request(app.getHttpServer())
      .post('/api/ingest')
      .set('x-api-key', apiKey)
      .send(body)
      .expect(201);
    expect((first.body as { status: string }).status).toBe('accepted');

    const countAfterFirst = await prisma.rawLog.count({
      where: { idempotencyKey },
    });
    expect(countAfterFirst).toBe(1);

    const second = await request(app.getHttpServer())
      .post('/api/ingest')
      .set('x-api-key', apiKey)
      .send(body)
      .expect(200);
    expect((second.body as { status: string }).status).toBe('duplicate');

    const countAfterSecond = await prisma.rawLog.count({
      where: { idempotencyKey },
    });
    expect(countAfterSecond).toBe(1); // 멱등성: 재전송해도 증가하지 않음
  });

  it('rejects an invalid signature with 401 and inserts nothing', async () => {
    const idempotencyKey = `e2e-bad-sig-${Date.now()}`;
    const occurredAt = new Date().toISOString();
    const rawLine = 'INC-05,10.00,mm';

    await request(app.getHttpServer())
      .post('/api/ingest')
      .set('x-api-key', apiKey)
      .send({
        siteId: 'site-e2e',
        agentId,
        sourceFile: 'C:/logs/e2e.txt',
        offset: 2,
        occurredAt,
        rawLine,
        idempotencyKey,
        signature: 'deadbeef',
      })
      .expect(401);

    const count = await prisma.rawLog.count({ where: { idempotencyKey } });
    expect(count).toBe(0);
  });

  it('rejects a missing/incorrect x-api-key with 401', async () => {
    await request(app.getHttpServer())
      .post('/api/ingest')
      .send({
        siteId: 'site-e2e',
        agentId,
        sourceFile: 'C:/logs/e2e.txt',
        offset: 3,
        occurredAt: new Date().toISOString(),
        rawLine: 'x',
        idempotencyKey: 'no-key',
        signature: 'x',
      })
      .expect(401);
  });
});
