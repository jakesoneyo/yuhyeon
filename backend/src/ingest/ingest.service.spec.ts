import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { IngestDto } from './dto/ingest.dto';
import { IngestService } from './ingest.service';

/**
 * IngestService 단위 테스트 — dedup CTE 결과(rows.length)에 따른 분기 로직만 검증한다.
 * 실제 원자성(동시성)은 실제 Postgres가 필요하므로 test/*.e2e-spec.ts(Testcontainers)에서 증명한다.
 */
describe('IngestService', () => {
  const payload: IngestDto = {
    siteId: 'site-test',
    agentId: 'agent-1',
    sourceFile: 'C:/logs/test.txt',
    offset: 10,
    occurredAt: '2026-07-20T09:12:33.000Z',
    rawLine: 'INC-04,14.28,mm',
    idempotencyKey: 'idem-key-1',
    signature: 'ignored-here',
  };

  async function createService(queryRawResult: Array<{ id: bigint }>) {
    const queryRawMock = jest.fn().mockResolvedValue(queryRawResult);
    const moduleRef = await Test.createTestingModule({
      providers: [
        IngestService,
        {
          provide: PrismaService,
          useValue: { $queryRaw: queryRawMock },
        },
      ],
    }).compile();

    return {
      service: moduleRef.get(IngestService),
      queryRawMock,
    };
  }

  it('CTE가 1행을 반환하면(신규 삽입) accepted를 반환한다', async () => {
    const { service } = await createService([{ id: 1n }]);
    const result = await service.ingest(payload);
    expect(result.status).toBe('accepted');
    expect(result.idempotencyKey).toBe(payload.idempotencyKey);
    expect((result as { receivedAt: string }).receivedAt).toBeDefined();
  });

  it('CTE가 0행을 반환하면(이미 존재) duplicate를 반환한다', async () => {
    const { service } = await createService([]);
    const result = await service.ingest(payload);
    expect(result.status).toBe('duplicate');
    expect(result.idempotencyKey).toBe(payload.idempotencyKey);
  });

  it('dedup 판정과 본삽입을 단일 $queryRaw 호출로만 수행한다(check-then-act 아님)', async () => {
    const { service, queryRawMock } = await createService([{ id: 2n }]);
    await service.ingest(payload);
    expect(queryRawMock).toHaveBeenCalledTimes(1);
  });
});
