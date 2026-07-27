-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Site" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingest_dedup" (
    "idempotency_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ingest_dedup_pkey" PRIMARY KEY ("idempotency_key")
);

-- CreateTable
CREATE TABLE "raw_logs" (
    "id" BIGSERIAL NOT NULL,
    "site_id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "source_file" TEXT NOT NULL,
    "line_offset" BIGINT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "raw_line" TEXT NOT NULL,
    "parsed_payload_json" JSONB,
    "idempotency_key" TEXT NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "raw_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Site_code_key" ON "Site"("code");

-- CreateIndex
CREATE UNIQUE INDEX "raw_logs_idempotency_key_key" ON "raw_logs"("idempotency_key");

-- CreateIndex
CREATE INDEX "raw_logs_site_id_occurred_at_idx" ON "raw_logs"("site_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "raw_logs_site_id_received_at_idx" ON "raw_logs"("site_id", "received_at" DESC);

-- AddForeignKey
ALTER TABLE "Site" ADD CONSTRAINT "Site_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
