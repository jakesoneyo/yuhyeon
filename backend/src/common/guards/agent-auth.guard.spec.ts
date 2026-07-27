import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { signPayload } from '../hmac.util';
import { AgentAuthGuard } from './agent-auth.guard';

/**
 * AgentAuthGuard 단위 테스트 — x-api-key → agentId 화이트리스트 → HMAC 서명
 * 3단계 검증 순서를 실제 HTTP 없이 ExecutionContext를 목킹해 검증한다.
 */
describe('AgentAuthGuard', () => {
  const apiKey = 'test-api-key';
  const hmacSecret = 'test-hmac-secret';
  const idempotencyKey = 'idem-1';
  const occurredAt = '2026-07-20T09:12:33.000Z';
  const rawLine = 'INC-04,14.28,mm';

  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.AGENT_API_KEY = apiKey;
    process.env.AGENT_HMAC_SECRET = hmacSecret;
    delete process.env.ALLOWED_AGENT_ID;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  function makeContext(
    headers: Record<string, string>,
    body: Record<string, unknown>,
  ): ExecutionContext {
    const request = {
      header: (name: string) => headers[name.toLowerCase()],
      body,
    } as unknown as Request;
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  }

  it('x-api-key가 없으면 401', () => {
    const guard = new AgentAuthGuard();
    const ctx = makeContext({}, {});
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('x-api-key만 있고 signature 필드가 없는 요청(예: stats 조회)은 통과한다', () => {
    const guard = new AgentAuthGuard();
    const ctx = makeContext({ 'x-api-key': apiKey }, {});
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('ALLOWED_AGENT_ID가 설정된 경우 화이트리스트에 없는 agentId는 401', () => {
    process.env.ALLOWED_AGENT_ID = 'allowed-agent';
    const guard = new AgentAuthGuard();
    const signature = signPayload(
      hmacSecret,
      idempotencyKey,
      occurredAt,
      rawLine,
    );
    const ctx = makeContext(
      { 'x-api-key': apiKey },
      {
        agentId: 'other-agent',
        idempotencyKey,
        occurredAt,
        rawLine,
        signature,
      },
    );
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('서명 검증에 필요한 필드가 누락되면 400', () => {
    const guard = new AgentAuthGuard();
    const ctx = makeContext({ 'x-api-key': apiKey }, { signature: 'anything' });
    expect(() => guard.canActivate(ctx)).toThrow(BadRequestException);
  });

  it('올바른 서명이면 통과한다', () => {
    const guard = new AgentAuthGuard();
    const signature = signPayload(
      hmacSecret,
      idempotencyKey,
      occurredAt,
      rawLine,
    );
    const ctx = makeContext(
      { 'x-api-key': apiKey },
      { idempotencyKey, occurredAt, rawLine, signature },
    );
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('틀린 서명이면 401', () => {
    const guard = new AgentAuthGuard();
    const ctx = makeContext(
      { 'x-api-key': apiKey },
      { idempotencyKey, occurredAt, rawLine, signature: 'deadbeef' },
    );
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });
});
