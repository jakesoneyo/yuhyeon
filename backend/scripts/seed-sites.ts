/**
 * 현장 시드 스크립트. Realistic 한국 건설현장 4개(주소·좌표는 실제 지명 기반 예시)를 멱등하게 생성한다.
 * code는 에이전트가 보내는 siteId와 논리적으로 매칭되므로(FK 없음, DATA-MODEL.md §1), 이후
 * simulate-ingest.ts(Stage 3)가 같은 code로 계측 로그를 채워야 대시보드가 채워진다.
 *
 * 이미 존재하는 code는 스킵 — 여러 번 실행해도 안전. admin 계정이 있으면 owner로 연결(없어도 무방, ownerId nullable).
 *
 * 실행: npm run seed:sites
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SITES = [
  {
    code: 'site-geumdan',
    name: '검단 오수펌프장 가시설',
    address: '인천광역시 서구 대곡동 검단신도시 오수펌프장 부지',
    lat: 37.5951,
    lng: 126.6673,
  },
  {
    code: 'site-seocho',
    name: '서초동 업무시설(백암빌딩) 개발사업',
    address: '서울특별시 서초구 서초대로 396',
    lat: 37.4919,
    lng: 127.0086,
  },
  {
    code: 'site-pangyo',
    name: '판교제2테크노밸리 G1-1BL 업무시설 신축공사',
    address: '경기도 성남시 수정구 대왕판교로 815',
    lat: 37.4008,
    lng: 127.1086,
  },
  {
    code: 'site-songdo',
    name: '송도국제업무단지 오피스텔 신축공사',
    address: '인천광역시 연수구 송도과학로 32',
    lat: 37.3925,
    lng: 126.6558,
  },
] as const;

async function main() {
  const admin = await prisma.user.findUnique({ where: { username: 'admin' } });
  if (!admin) {
    console.warn(
      '[seed-sites] admin 계정이 아직 없습니다 — owner 없이(ownerId=null) 시드합니다. (npm run seed:admin을 먼저 실행하는 것을 권장)',
    );
  }

  for (const site of SITES) {
    const existing = await prisma.site.findUnique({
      where: { code: site.code },
    });
    if (existing) {
      console.log(`[seed-sites] ${site.code} 이미 존재 — 스킵`);
      continue;
    }

    await prisma.site.create({
      data: { ...site, ownerId: admin?.id },
    });
    console.log(`[seed-sites] ${site.code} (${site.name}) 생성 완료`);
  }
}

main()
  .catch((error) => {
    console.error('[seed-sites] 실패:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
