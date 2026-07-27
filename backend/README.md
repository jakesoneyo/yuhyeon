# backend

NestJS 수집/대시보드 API. 전체 아키텍처·실행법·테스트는 루트 [`../README.md`](../README.md)를 참고한다.

## 요약

- `POST /api/ingest` — 에이전트용 수집 엔드포인트(`x-api-key` + HMAC 서명, `AgentAuthGuard`)
- `/api/auth/*`, `/api/sites/*` — 대시보드용(JWT, `JwtAuthGuard`)
- `GET /api/health` — DB 핑 포함 헬스체크
- `GET /api/docs` — Swagger API 문서

## 스크립트

```bash
npm run start:dev     # 개발 서버(watch)
npm test              # 단위 테스트
npm run test:e2e      # 통합 테스트(Testcontainers Postgres)
npm run lint           # eslint --fix
npm run seed:demo     # admin → 현장 → HMAC 서명 시뮬레이션 데모 데이터
```

## 폴더

```
src/
├─ ingest/     수집 파이프라인(AgentAuthGuard + 원자적 dedup CTE)
├─ auth/       사람 인증(Passport-JWT)
├─ sites/      대시보드 집계 API
├─ health/     헬스체크
├─ prisma/     Prisma 커넥션 라이프사이클
└─ common/     hmac.util(서명 진실의 근원) · alert-rules(경보 임계값) · 가드/필터
scripts/       seed-admin / seed-sites / simulate-ingest
```
