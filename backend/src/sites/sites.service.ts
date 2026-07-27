import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { evaluateAlertLevel, thresholdFor } from '../common/alert-rules';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardWindow } from './dto/dashboard-query.dto';

/** 대시보드 조회 창(window) 문자열 -> 시간(hour) 매핑. 규칙 자체는 상수(코드)로만 관리(DATA-MODEL §6). */
const WINDOW_HOURS: Record<DashboardWindow, number> = {
  '1h': 1,
  '24h': 24,
  '7d': 24 * 7,
};

/** "수신률" 계산에 쓰는 기대 수신 주기. 실측 주기를 저장하지 않으므로 상수로 가정한다(현장 에이전트 통상 전송 간격). */
const EXPECTED_INTERVAL_MINUTES = 5;

/** 대시보드에 노출할 최근 구간 표본 상한(응답 크기·쿼리 비용 방지용 캡). */
const WINDOW_SAMPLE_LIMIT = 500;
const RECENT_LOG_LINES_LIMIT = 20;
const RECENT_ALERTS_LIMIT = 20;

type KpiTone = 'neutral' | 'success' | 'warning' | 'danger';

interface ParsedNumericPayload {
  value?: number;
  sensorId?: string;
}

function extractParsed(payload: Prisma.JsonValue | null): ParsedNumericPayload {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {};
  }
  const record = payload as Record<string, unknown>;
  const value = typeof record.value === 'number' ? record.value : undefined;
  const sensorId =
    typeof record.sensorId === 'string' ? record.sensorId : undefined;
  return { value, sensorId };
}

// 'sv-SE' 로케일은 "YYYY-MM-DD HH:mm:ss" 포맷을 그대로 내려줘 별도 문자열 조립이 필요 없다.
const KST_LABEL_FORMATTER = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});
const KST_TIME_FORMATTER = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Seoul',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

/** 저장은 UTC, 라벨만 KST "YYYY-MM-DD HH:mm:ss"로 포맷(API.md 공통 규약). */
function formatKstLabel(date: Date | null): string {
  return date ? KST_LABEL_FORMATTER.format(date) : '-';
}

function formatKstTime(date: Date): string {
  return KST_TIME_FORMATTER.format(date);
}

@Injectable()
export class SitesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 현장 목록 + 수신 요약. N+1을 피하기 위해 (1) 현장 목록, (2) raw_logs groupBy 집계,
   * (3) 최근 24h 표본 1건으로 경보 건수를 계산하는 **총 3개의 고정 쿼리**만 사용한다
   * (현장 수가 늘어나도 쿼리 수가 늘지 않음 — DATA-MODEL.md §6 N+1 방지 예시와 동일한 패턴).
   */
  async getSites() {
    const since = new Date(Date.now() - WINDOW_HOURS['24h'] * 60 * 60 * 1000);

    const [sites, stats, recentSample] = await Promise.all([
      this.prisma.site.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.rawLog.groupBy({
        by: ['siteId'],
        _count: { _all: true },
        _max: { receivedAt: true },
      }),
      this.prisma.rawLog.findMany({
        where: { occurredAt: { gte: since } },
        select: { siteId: true, parsedPayload: true },
        take: WINDOW_SAMPLE_LIMIT,
      }),
    ]);

    const statsByCode = new Map(stats.map((s) => [s.siteId, s]));
    const alertCountByCode = new Map<string, number>();
    for (const row of recentSample) {
      const { sensorId, value } = extractParsed(row.parsedPayload);
      const level = evaluateAlertLevel(sensorId, value);
      if (level && level !== 'ok') {
        alertCountByCode.set(
          row.siteId,
          (alertCountByCode.get(row.siteId) ?? 0) + 1,
        );
      }
    }

    return sites.map((site) => {
      const stat = statsByCode.get(site.code);
      return {
        id: site.id,
        code: site.code,
        name: site.name,
        address: site.address,
        lat: site.lat,
        lng: site.lng,
        logCount: stat?._count._all ?? 0,
        lastReceivedAt: stat?._max.receivedAt?.toISOString() ?? null,
        alertCount: alertCountByCode.get(site.code) ?? 0,
      };
    });
  }

  /**
   * 현장 상세 대시보드 스냅샷(F7). KPI·추이·경보·로그를 raw_logs에서 그때그때 계산한다
   * (별도 집계 테이블 없음 — DATA-MODEL §6 ponytail 원칙).
   * @throws NotFoundException 등록되지 않은 현장 code
   */
  async getDashboard(code: string, window: DashboardWindow = '24h') {
    const site = await this.prisma.site.findUnique({ where: { code } });
    if (!site) {
      throw new NotFoundException(`Site not found: ${code}`);
    }

    const windowHours = WINDOW_HOURS[window];
    const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);

    const rows = await this.prisma.rawLog.findMany({
      where: { siteId: code, occurredAt: { gte: since } },
      orderBy: { occurredAt: 'asc' },
      take: WINDOW_SAMPLE_LIMIT,
      select: {
        id: true,
        occurredAt: true,
        rawLine: true,
        parsedPayload: true,
      },
    });

    const series = rows
      .map((row) => {
        const { value, sensorId } = extractParsed(row.parsedPayload);
        if (typeof value !== 'number') return null;
        return {
          t: row.occurredAt.toISOString(),
          value,
          sensorId: sensorId ?? '',
        };
      })
      .filter(
        (point): point is { t: string; value: number; sensorId: string } =>
          point !== null,
      );

    const alerts = rows
      .map((row) => {
        const { value, sensorId } = extractParsed(row.parsedPayload);
        const level = evaluateAlertLevel(sensorId, value);
        if (!level || level === 'ok') return null;
        const threshold = thresholdFor(sensorId);
        return {
          id: row.id.toString(),
          time: formatKstTime(row.occurredAt),
          occurredAt: row.occurredAt,
          message: `${sensorId} ${threshold?.label ?? '계측'} 관리기준 초과 (${value}${threshold?.unit ?? ''})`,
          level,
        };
      })
      .filter((a): a is NonNullable<typeof a> => a !== null)
      .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
      .slice(0, RECENT_ALERTS_LIMIT)
      .map(({ id, time, message, level }) => ({ id, time, message, level }));

    const logLines = [...rows]
      .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
      .slice(0, RECENT_LOG_LINES_LIMIT)
      .map((row) => ({
        time: formatKstTime(row.occurredAt),
        message: row.rawLine,
      }));

    const totalCount = rows.length;
    const dangerCount = alerts.filter((a) => a.level === 'danger').length;

    // "수신률": 실측 전송 주기를 저장하지 않으므로 기대 주기(EXPECTED_INTERVAL_MINUTES) 대비
    // 실제 수신 건수 비율로 근사한다(상한 100%). 표본 캡(WINDOW_SAMPLE_LIMIT)에 걸리면
    // 실제보다 낮게 보일 수 있음 — 데모 데이터 규모에서는 문제되지 않는다.
    const expectedCount = Math.max(
      1,
      (windowHours * 60) / EXPECTED_INTERVAL_MINUTES,
    );
    const rate = Math.min(100, (totalCount / expectedCount) * 100);
    const rateTone: KpiTone =
      rate >= 95 ? 'success' : rate >= 80 ? 'warning' : 'danger';

    const latestReceived = rows.at(-1)?.occurredAt ?? null;

    return {
      site: {
        code: site.code,
        name: site.name,
        updatedAtLabel: formatKstLabel(latestReceived),
      },
      kpis: [
        {
          id: 'total',
          label: '총 수신',
          value: String(totalCount),
          tone: 'neutral' as const,
        },
        {
          id: 'alerts',
          label: '경고',
          value: String(alerts.length),
          tone: alerts.length > 0 ? ('danger' as const) : ('success' as const),
        },
        {
          id: 'rate',
          label: '수신률',
          value: `${rate.toFixed(1)}%`,
          tone: rateTone,
        },
        {
          id: 'danger',
          label: '위험',
          value: String(dangerCount),
          tone: dangerCount > 0 ? ('danger' as const) : ('success' as const),
        },
      ],
      series,
      alerts,
      logLines,
    };
  }

  /**
   * 현장별 원시 로그 커서 페이지네이션(F9). id(bigint, autoincrement)를 커서로 사용해
   * 최신순으로 내려간다 — 정렬 컬럼이 단조 증가하므로 offset 방식보다 안정적이다.
   */
  async getLogs(code: string, cursor?: string, limit = 50) {
    let cursorId: bigint | undefined;
    if (cursor) {
      try {
        cursorId = BigInt(cursor);
      } catch {
        cursorId = undefined;
      }
    }

    const rows = await this.prisma.rawLog.findMany({
      where: {
        siteId: code,
        ...(cursorId !== undefined ? { id: { lt: cursorId } } : {}),
      },
      orderBy: { id: 'desc' },
      take: limit + 1,
      select: {
        id: true,
        occurredAt: true,
        rawLine: true,
        parsedPayload: true,
      },
    });

    const hasMore = rows.length > limit;
    const items = (hasMore ? rows.slice(0, limit) : rows).map((row) => ({
      id: row.id.toString(),
      occurredAt: row.occurredAt.toISOString(),
      rawLine: row.rawLine,
      parsedPayload: row.parsedPayload,
    }));

    return {
      items,
      nextCursor: hasMore ? items.at(-1)?.id : null,
    };
  }
}
