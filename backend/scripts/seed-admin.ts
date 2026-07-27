/**
 * 데모 계정 시드 스크립트. `admin`/`admin`(ADMIN 권한)을 멱등하게 생성한다.
 * 이미 존재하면 스킵 — 여러 번 실행해도 안전. 워크스페이스 표준 "데모 로그인 계정" 규칙 준수.
 *
 * 실행: npm run seed:admin (DATABASE_URL이 가리키는 DB에 실행되므로 대상 확인 후 실행할 것)
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.findUnique({
    where: { username: 'admin' },
  });
  if (existing) {
    console.log('[seed-admin] admin 계정이 이미 존재합니다 — 스킵');
    return;
  }

  const passwordHash = await argon2.hash('admin');
  await prisma.user.create({
    data: { username: 'admin', passwordHash, role: 'ADMIN' },
  });
  console.log('[seed-admin] admin/admin 계정을 생성했습니다 (role=ADMIN)');
}

main()
  .catch((error) => {
    console.error('[seed-admin] 실패:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
