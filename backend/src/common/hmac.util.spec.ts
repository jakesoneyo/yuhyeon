import { createHmac } from 'crypto';
import { signPayload, verifySignature } from './hmac.util';

describe('hmac.util', () => {
  const secret = 'test-secret';
  const idempotencyKey = 'abc123';
  const occurredAt = '2026-07-20T09:12:33.000Z';
  const rawLine = 'INC-04,14.28,mm';

  it('signPayload는 base=`${idempotencyKey}:${occurredAt}:${rawLine}`의 HMAC-SHA256 hex를 반환한다', () => {
    const expected = createHmac('sha256', secret)
      .update(`${idempotencyKey}:${occurredAt}:${rawLine}`)
      .digest('hex');
    expect(signPayload(secret, idempotencyKey, occurredAt, rawLine)).toBe(
      expected,
    );
  });

  it('올바른 서명은 verifySignature를 통과한다', () => {
    const signature = signPayload(secret, idempotencyKey, occurredAt, rawLine);
    expect(
      verifySignature(secret, idempotencyKey, occurredAt, rawLine, signature),
    ).toBe(true);
  });

  it('틀린 서명은 실패한다', () => {
    expect(
      verifySignature(secret, idempotencyKey, occurredAt, rawLine, 'deadbeef'),
    ).toBe(false);
  });

  it('길이가 다른 서명도 예외 없이 false를 반환한다 (timingSafeEqual 길이 불일치 방어)', () => {
    expect(
      verifySignature(secret, idempotencyKey, occurredAt, rawLine, 'short'),
    ).toBe(false);
  });

  it('다른 시크릿으로 만든 서명은 실패한다', () => {
    const signature = signPayload(
      'other-secret',
      idempotencyKey,
      occurredAt,
      rawLine,
    );
    expect(
      verifySignature(secret, idempotencyKey, occurredAt, rawLine, signature),
    ).toBe(false);
  });
});
