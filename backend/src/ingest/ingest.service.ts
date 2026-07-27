import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IngestDto } from './dto/ingest.dto';

@Injectable()
export class IngestService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 계측 로그 1건을 멱등 적재한다. AgentAuthGuard 통과 후에만 호출되므로
   * 이 지점에서는 이미 서명이 유효한 신뢰된 페이로드로 취급한다.
   * @returns 신규 적재면 accepted, 이미 존재하는 idempotencyKey면 duplicate(재전송 안전).
   */
  async ingest(payload: IngestDto) {
    const receivedAt = new Date();
    const inserted = await this.insertIngestRecord(payload, receivedAt);

    if (!inserted) {
      return {
        status: 'duplicate' as const,
        idempotencyKey: payload.idempotencyKey,
      };
    }

    return {
      status: 'accepted' as const,
      idempotencyKey: payload.idempotencyKey,
      receivedAt: receivedAt.toISOString(),
    };
  }

  async stats() {
    const [dedupCount, rawLogCount] = await Promise.all([
      this.prisma.ingestDedup.count(),
      this.prisma.rawLog.count(),
    ]);

    return { storageMode: 'postgres' as const, dedupCount, rawLogCount };
  }

  /**
   * dedup 판정과 raw_logs 본삽입을 단일 CTE 문으로 원자 처리한다.
   * Prisma의 upsert/create로는 "다른 테이블(ingest_dedup) 삽입 성공을 조건으로 한
   * 이 테이블(raw_logs) 삽입"을 표현할 수 없어 $queryRaw로 남긴다(DATA-MODEL.md §4).
   * check-then-act(findUnique 후 create)는 동시 요청 시 유니크 충돌을 유발하므로 금지.
   */
  private async insertIngestRecord(
    payload: IngestDto,
    receivedAt: Date,
  ): Promise<boolean> {
    const parsedPayloadJson = payload.parsedPayload
      ? JSON.stringify(payload.parsedPayload)
      : null;

    // $queryRaw 태그드 템플릿은 값을 자동 바인딩(파라미터화)하므로 SQL 인젝션에 안전하다.
    const rows = await this.prisma.$queryRaw<{ id: bigint }[]>`
      WITH inserted_dedup AS (
        INSERT INTO ingest_dedup (idempotency_key, created_at)
        VALUES (${payload.idempotencyKey}, ${receivedAt})
        ON CONFLICT (idempotency_key) DO NOTHING
        RETURNING idempotency_key
      )
      INSERT INTO raw_logs (
        site_id, agent_id, source_file, line_offset, occurred_at,
        raw_line, parsed_payload_json, idempotency_key, received_at
      )
      SELECT ${payload.siteId}, ${payload.agentId}, ${payload.sourceFile}, ${payload.offset},
             ${new Date(payload.occurredAt)}::timestamptz,
             ${payload.rawLine}, ${parsedPayloadJson}::jsonb, ${payload.idempotencyKey}, ${receivedAt}::timestamptz
      WHERE EXISTS (SELECT 1 FROM inserted_dedup)
      RETURNING id
    `;

    return rows.length > 0;
  }
}
