import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { verifySignature } from '../hmac.util';

/**
 * "기계 경계" 인증 가드. 기존 AppService.validateAuth를 그대로 이식했다.
 * 검증 순서(API.md 그대로): ① x-api-key 일치 → ② (옵션) agentId 화이트리스트 → ③ HMAC 서명(timingSafeEqual).
 *
 * GET /api/ingest/stats처럼 서명 가능한 바디가 없는 요청은 x-api-key만 검증한다
 * (HMAC은 `signature` 필드가 있는 요청, 즉 POST /api/ingest에만 적용).
 */
@Injectable()
export class AgentAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const body = (request.body ?? {}) as Record<string, unknown>;

    const expectedApiKey = process.env.AGENT_API_KEY;
    if (!expectedApiKey) {
      throw new UnauthorizedException(
        'AGENT_API_KEY is not configured on server',
      );
    }
    if (request.header('x-api-key') !== expectedApiKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    // 서명 필드가 없는 요청(예: 통계 조회)은 API 키 검증만으로 충분 — 서명할 바디가 없다.
    if (typeof body.signature !== 'string') {
      return true;
    }

    const allowedAgentId = process.env.ALLOWED_AGENT_ID;
    if (allowedAgentId && body.agentId !== allowedAgentId) {
      throw new UnauthorizedException('This agent is not allowed');
    }

    const hmacSecret = process.env.AGENT_HMAC_SECRET;
    if (!hmacSecret) {
      throw new UnauthorizedException(
        'AGENT_HMAC_SECRET is not configured on server',
      );
    }

    const { idempotencyKey, occurredAt, rawLine, signature } = body;
    if (
      typeof idempotencyKey !== 'string' ||
      typeof occurredAt !== 'string' ||
      typeof rawLine !== 'string' ||
      !idempotencyKey ||
      !occurredAt ||
      !rawLine
    ) {
      throw new BadRequestException(
        'Missing required field for signature verification',
      );
    }

    if (
      !verifySignature(
        hmacSecret,
        idempotencyKey,
        occurredAt,
        rawLine,
        signature,
      )
    ) {
      throw new UnauthorizedException('Invalid signature');
    }

    return true;
  }
}
