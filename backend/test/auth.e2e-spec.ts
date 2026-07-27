import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as argon2 from 'argon2';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * 인증(사람 경계) e2e — 데모 admin 예외, register 이메일 강제, JWT 보호 라우트를 검증한다.
 * 로컬 테스트 DB(DATABASE_URL)에 admin 사용자를 직접 시드하고 끝에 정리한다.
 */
describe('Auth API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret';

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

    await prisma.user.upsert({
      where: { username: 'admin' },
      update: {},
      create: {
        username: 'admin',
        passwordHash: await argon2.hash('admin'),
        role: 'ADMIN',
      },
    });
  });

  afterAll(async () => {
    // 'admin'은 이 테스트가 만든 게 아니라 데모 시드(seed-admin)일 수 있으므로 지우지 않는다 —
    // 로컬 데모 DB에 대해 실행할 때 데모 로그인 계정이 삭제되는 부작용을 막는다.
    await prisma.user.deleteMany({
      where: { username: 'e2e-register-user@example.com' },
    });
    await app.close();
  });

  it('admin/admin 로그인 성공 시 JWT를 발급한다', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin' })
      .expect(200);

    const body = res.body as {
      accessToken: string;
      user: { username: string };
    };
    expect(typeof body.accessToken).toBe('string');
    expect(body.user.username).toBe('admin');
  });

  it('틀린 admin 비밀번호는 401 (백도어 없음)', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'wrong-password' })
      .expect(401);
  });

  it('발급받은 토큰으로 /api/auth/me 호출 시 200', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin' })
      .expect(200);
    const { accessToken } = login.body as { accessToken: string };

    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((res) => {
        expect((res.body as { username: string }).username).toBe('admin');
      });
  });

  it('토큰 없이 /api/auth/me 호출 시 401', async () => {
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });

  it('register는 admin 같은 비-이메일 문자열을 거부한다 (400)', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ username: 'admin', password: 'password123' })
      .expect(400);
  });

  it('register는 실제 이메일 형식이면 통과한다 (201)', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        username: 'e2e-register-user@example.com',
        password: 'password123',
      })
      .expect(201);
  });
});
