# 멀티스테이지 빌드 — 최종 이미지에는 컴파일된 dist·prod 의존성·prisma(마이그레이션 CLI)만 남긴다.

# ---- 1) 빌드 스테이지: 전체 의존성으로 TS 컴파일 + Prisma client 생성 ----
FROM node:24-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build

# ---- 2) 운영 의존성 스테이지: devDependencies 없이 설치 + Prisma client 재생성 ----
FROM node:24-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY prisma ./prisma
RUN npx prisma generate

# ---- 3) 런타임 스테이지 ----
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY --from=builder /app/dist ./dist
COPY package.json ./

EXPOSE 3000

# 이 프로젝트는 마이그레이션이 fresh init 1개뿐이라 컨테이너 시작 시 `migrate deploy`를 실행해도 안전하다.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
