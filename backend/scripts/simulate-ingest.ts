/**
 * 데모용 계측 이력 시뮬레이터. DB에 직접 INSERT 하지 않고, `common/hmac.util.ts`(에이전트와
 * 동일한 서명 로직)를 그대로 재사용해 실제 서명된 `POST /api/ingest` 요청을 보낸다 —
 * 즉 대시보드에 채워지는 데이터 자체가 수집 파이프라인(서명 검증 + 원자적 dedup 적재)이
 * 정상 동작한다는 증거가 된다.
 *
 * 실행 전 백엔드 서버가 떠 있어야 한다(`npm run start:dev` 등). DB 직결이 아니라 HTTP를
 * 통해서만 데이터를 만든다.
 *
 * 재실행 시 멱등: sourceFile·offset·rawLine을 사이트별 고정 시드(mulberry32)로 결정적으로
 * 생성하므로, idempotencyKey(=sha256(sourceFile:offset:rawLine))가 실행마다 동일하다.
 * 따라서 두 번째 실행부터는 전부 `duplicate` 응답만 받고 raw_logs가 늘지 않는다.
 *
 * 실행: npm run seed:simulate (server가 떠 있는 상태에서)
 */
import 'dotenv/config';
import { createHash } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { ALERT_THRESHOLDS, AlertThreshold } from '../src/common/alert-rules';
import { signPayload } from '../src/common/hmac.util';

const prisma = new PrismaClient();

const PORT = process.env.PORT ?? '3000';
const INGEST_URL = `http://localhost:${PORT}/api/ingest`;
const API_KEY = process.env.AGENT_API_KEY;
const HMAC_SECRET = process.env.AGENT_HMAC_SECRET;
// 화이트리스트가 설정돼 있으면 반드시 그 값을 써야 AgentAuthGuard를 통과한다.
const AGENT_ID = process.env.ALLOWED_AGENT_ID || 'field-pc-001';

// 과거 며칠에 걸쳐 데이터를 분산시키고, 하루당 이만큼의 계측 라인을 생성한다.
const DAYS_BACK = 3;
const READINGS_PER_DAY = 24;
// 시연을 명확히 하기 위해 가장 최근(day=0) 앞쪽 몇 건은 강제로 경보 구간 값을 만든다.
const FORCED_ALERT_LEVELS: Array<'danger' | 'warn'> = [
  'danger',
  'warn',
  'danger',
];
// 정상 전송이 끝난 뒤 같은 페이로드를 한 번 더 보내 멱등성(duplicate)을 시연할 사이트당 건수.
const DUPLICATE_DEMO_COUNT_PER_SITE = 2;

const SENSOR_PREFIXES = Object.keys(ALERT_THRESHOLDS);

interface IngestBody {
  siteId: string;
  agentId: string;
  sourceFile: string;
  offset: number;
  occurredAt: string;
  rawLine: string;
  parsedPayload: Record<string, unknown>;
  idempotencyKey: string;
  signature: string;
}

/** 결정적 PRNG(mulberry32). 문자열 시드로 초기화해 사이트별로 매 실행 동일한 값 시퀀스를 재현한다. */
function mulberry32(seed: number) {
  let state = seed;
  return function random() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return hash;
}

/** 관리기준(warn/danger) 구간에 맞는 값을 만든다. 'ok'는 warn 미만, 'warn'/'danger'는 각 구간 안쪽 값. */
function valueForLevel(
  threshold: AlertThreshold,
  level: 'ok' | 'warn' | 'danger',
  rng: () => number,
): number {
  let raw: number;
  if (level === 'danger') {
    raw = threshold.danger + rng() * threshold.danger * 0.4;
  } else if (level === 'warn') {
    raw = threshold.warn + rng() * (threshold.danger - threshold.warn) * 0.9;
  } else {
    raw = rng() * threshold.warn * 0.8;
  }
  return Math.round(raw * 100) / 100;
}

/**
 * 사이트 1곳의 계측 이력을 결정적으로 생성한다. rawLine 포맷은 agent의 parseRawLine과
 * 동일한 두 방식(csv/kv)을 번갈아 사용해 파이프라인이 실제로 다루는 포맷을 재현한다.
 */
function buildSiteReadings(siteCode: string): IngestBody[] {
  const rng = mulberry32(seedFromString(siteCode));
  const sourceFile = `C:/logs/${siteCode}.txt`;
  const readings: IngestBody[] = [];
  let offset = 0;

  // day=DAYS_BACK-1(가장 오래됨) -> day=0(오늘)로 오래된 순서부터 생성.
  for (let day = DAYS_BACK - 1; day >= 0; day -= 1) {
    for (let k = 0; k < READINGS_PER_DAY; k += 1) {
      const prefix =
        SENSOR_PREFIXES[(day * READINGS_PER_DAY + k) % SENSOR_PREFIXES.length];
      const threshold = ALERT_THRESHOLDS[prefix];
      const sensorId = `${prefix}-01`;

      const forced = day === 0 ? FORCED_ALERT_LEVELS[k] : undefined;
      let level: 'ok' | 'warn' | 'danger';
      if (forced) {
        level = forced;
      } else {
        const roll = rng();
        level = roll < 0.08 ? 'danger' : roll < 0.22 ? 'warn' : 'ok';
      }

      const value = valueForLevel(threshold, level, rng);
      const format = k % 2 === 0 ? 'csv' : 'kv';
      const rawLine =
        format === 'csv'
          ? `${sensorId},${value},${threshold.unit}`
          : `sensorId=${sensorId},value=${value},unit=${threshold.unit}`;

      // 하루 안에서 무작위 시각(과거 방향)으로 분산시킨다. 최신 데이터는 day=0 범위(최근 24h) 안에 들어온다.
      const msIntoDay = Math.floor(rng() * 24 * 60 * 60 * 1000);
      const msAgo = day * 24 * 60 * 60 * 1000 + msIntoDay;
      const occurredAt = new Date(Date.now() - msAgo).toISOString();

      const idempotencyKey = createHash('sha256')
        .update(`${sourceFile}:${offset}:${rawLine}`)
        .digest('hex');
      const signature = signPayload(
        HMAC_SECRET!,
        idempotencyKey,
        occurredAt,
        rawLine,
      );

      readings.push({
        siteId: siteCode,
        agentId: AGENT_ID,
        sourceFile,
        offset,
        occurredAt,
        rawLine,
        parsedPayload: { format, sensorId, value, unit: threshold.unit },
        idempotencyKey,
        signature,
      });

      // 실제 tail 오프셋처럼 라인 바이트 길이만큼 누적 — 다음 idempotencyKey를 유일하게 만든다.
      offset += Buffer.byteLength(rawLine, 'utf8') + 1;
    }
  }

  return readings;
}

async function postIngest(
  body: IngestBody,
): Promise<'accepted' | 'duplicate' | 'error'> {
  try {
    const res = await fetch(INGEST_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': API_KEY! },
      body: JSON.stringify(body),
    });
    if (res.status === 201) return 'accepted';
    if (res.status === 200) return 'duplicate';
    const text = await res.text();
    console.error(`[simulate-ingest] 예상치 못한 응답 ${res.status}: ${text}`);
    return 'error';
  } catch (error) {
    console.error(
      `[simulate-ingest] 요청 실패 — 백엔드 서버(${INGEST_URL})가 떠 있는지 확인하세요.`,
      error instanceof Error ? error.message : error,
    );
    return 'error';
  }
}

async function main() {
  if (!API_KEY || !HMAC_SECRET) {
    throw new Error(
      'AGENT_API_KEY / AGENT_HMAC_SECRET 환경변수가 필요합니다(.env 확인).',
    );
  }

  const sites = await prisma.site.findMany({ orderBy: { code: 'asc' } });
  if (sites.length === 0) {
    throw new Error(
      '시드된 현장이 없습니다. 먼저 npm run seed:sites를 실행하세요.',
    );
  }

  let totalAccepted = 0;
  let totalDuplicate = 0;
  let totalError = 0;
  const forcedAlertCount = sites.length * FORCED_ALERT_LEVELS.length;

  for (const site of sites) {
    const readings = buildSiteReadings(site.code);
    let accepted = 0;
    let duplicate = 0;
    let errorCount = 0;

    for (const reading of readings) {
      const result = await postIngest(reading);
      if (result === 'accepted') accepted += 1;
      else if (result === 'duplicate') duplicate += 1;
      else errorCount += 1;
    }

    console.log(
      `[simulate-ingest] ${site.code}: 전송 ${readings.length}건 → accepted ${accepted}, duplicate ${duplicate}, error ${errorCount}`,
    );

    // 멱등성 시연: 이미 보낸 페이로드 중 일부를 그대로 재전송 → 전부 duplicate가 나와야 정상.
    const resendSample = readings.slice(0, DUPLICATE_DEMO_COUNT_PER_SITE);
    let resendDuplicate = 0;
    for (const reading of resendSample) {
      const result = await postIngest(reading);
      if (result === 'duplicate') resendDuplicate += 1;
    }
    console.log(
      `[simulate-ingest] ${site.code}: 중복 재전송 시연 ${resendSample.length}건 → duplicate ${resendDuplicate}건 확인`,
    );

    totalAccepted += accepted;
    totalDuplicate += duplicate + resendDuplicate;
    totalError += errorCount;
  }

  console.log(
    `[simulate-ingest] 완료 — 총 accepted ${totalAccepted}, duplicate ${totalDuplicate}, error ${totalError} (강제 경보 시드 ${forcedAlertCount}건 포함)`,
  );

  const stats = await fetch(`${INGEST_URL}/stats`, {
    headers: { 'x-api-key': API_KEY },
  }).then((res) => res.json());
  console.log('[simulate-ingest] /api/ingest/stats:', stats);

  if (totalError > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error('[simulate-ingest] 실패:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
