import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

/**
 * 에이전트가 보내는 계측 로그 1건 수집 요청.
 * 기존 app.service.ts의 수동 validateRequiredFields(필수 필드 + offset 유효 숫자)를
 * class-validator 데코레이터로 대체한다. 서명(HMAC)은 DTO가 아니라 AgentAuthGuard가 검증한다.
 */
export class IngestDto {
  @ApiProperty({ example: 'site-geumdan' })
  @IsString()
  @IsNotEmpty()
  siteId!: string;

  @ApiProperty({ example: 'field-pc-001' })
  @IsString()
  @IsNotEmpty()
  agentId!: string;

  @ApiProperty({ example: 'C:/logs/inc.txt' })
  @IsString()
  @IsNotEmpty()
  sourceFile!: string;

  // 로그 파일 내 바이트 offset. 정수만 허용(음수 방지는 두지 않음 — 에이전트가 항상 tail 누적값을 보냄).
  @ApiProperty({ example: 10240 })
  @IsInt()
  offset!: number;

  @ApiProperty({ example: '2026-07-20T09:12:33.000Z' })
  @IsISO8601()
  occurredAt!: string;

  @ApiProperty({ example: 'INC-04,14.28,mm' })
  @IsString()
  @IsNotEmpty()
  rawLine!: string;

  @ApiPropertyOptional({
    example: { format: 'csv', sensorId: 'INC-04', value: 14.28, unit: 'mm' },
  })
  @IsOptional()
  @IsObject()
  parsedPayload?: Record<string, unknown>;

  @ApiProperty({ description: 'sha256(sourceFile:offset:rawLine)' })
  @IsString()
  @IsNotEmpty()
  idempotencyKey!: string;

  @ApiProperty({
    description:
      'HMAC_SHA256(AGENT_HMAC_SECRET, `${idempotencyKey}:${occurredAt}:${rawLine}`)',
  })
  @IsString()
  @IsNotEmpty()
  signature!: string;
}
