import { createHmac, timingSafeEqual } from 'crypto';

/**
 * 에이전트(기계) 서명 로직의 "진실의 근원".
 * agent/src/index.ts(enqueueLine)·시뮬레이터·백엔드 Guard 3자가 동일한 서명을 재현해야 하므로
 * 이 규칙을 바꾸면 셋 다 같이 바꿔야 한다 — 절대 개별적으로 수정하지 말 것.
 *
 * idempotencyKey = sha256(`${sourceFile}:${offset}:${rawLine}`)  (에이전트가 계산해 전송)
 * signature base = `${idempotencyKey}:${occurredAt}:${rawLine}`
 * signature      = HMAC_SHA256(secret, base)
 */
export function buildSignatureBase(
  idempotencyKey: string,
  occurredAt: string,
  rawLine: string,
): string {
  return `${idempotencyKey}:${occurredAt}:${rawLine}`;
}

/** 공유 시크릿으로 서명 base의 HMAC-SHA256 hex 다이제스트를 생성한다(에이전트·시뮬레이터 재사용). */
export function signPayload(
  secret: string,
  idempotencyKey: string,
  occurredAt: string,
  rawLine: string,
): string {
  const base = buildSignatureBase(idempotencyKey, occurredAt, rawLine);
  return createHmac('sha256', secret).update(base).digest('hex');
}

/**
 * 제공된 서명이 기대값과 일치하는지 검증한다.
 * 왜 `===` 대신 timingSafeEqual: 문자열 비교는 첫 불일치 바이트에서 조기 종료되어
 * 비교 소요 시간으로 서명을 바이트 단위 추측할 수 있는 타이밍 사이드채널을 만든다.
 * 길이가 다르면 timingSafeEqual 자체가 예외를 던지므로 길이를 먼저 비교해 우회한다.
 */
export function verifySignature(
  secret: string,
  idempotencyKey: string,
  occurredAt: string,
  rawLine: string,
  providedSignature: string,
): boolean {
  const expectedSignature = signPayload(
    secret,
    idempotencyKey,
    occurredAt,
    rawLine,
  );
  const expected = Buffer.from(expectedSignature, 'utf8');
  const provided = Buffer.from(providedSignature, 'utf8');

  if (expected.length !== provided.length) {
    return false;
  }
  return timingSafeEqual(expected, provided);
}
