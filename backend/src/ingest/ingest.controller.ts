import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AgentAuthGuard } from '../common/guards/agent-auth.guard';
import { IngestDto } from './dto/ingest.dto';
import { IngestService } from './ingest.service';

/** 기계 경계(에이전트→서버) 수집 API. 모든 라우트는 AgentAuthGuard(x-api-key(+HMAC))로 보호된다. */
@ApiTags('ingest')
@ApiHeader({ name: 'x-api-key', required: true })
@UseGuards(AgentAuthGuard)
@Controller('api/ingest')
export class IngestController {
  constructor(private readonly ingestService: IngestService) {}

  /**
   * 계측 로그 1건 수집. 신규 적재는 201, 이미 처리된 idempotencyKey 재전송은 200(재전송 안전).
   * 예외: 필드 누락/형식 오류(400), API 키/agentId/서명 불일치(401) — AgentAuthGuard·ValidationPipe가 처리.
   */
  @Post()
  @ApiOperation({ summary: '계측 로그 1건 멱등 수집' })
  @ApiResponse({ status: 201, description: 'accepted (신규 적재)' })
  @ApiResponse({ status: 200, description: 'duplicate (멱등 중복)' })
  async ingest(
    @Body() body: IngestDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.ingestService.ingest(body);
    // status에 따라 응답 코드를 동적으로 분기(신규=201, 중복=200) — @HttpCode는 고정값만 지원하므로 여기서 직접 설정.
    res.status(
      result.status === 'accepted' ? HttpStatus.CREATED : HttpStatus.OK,
    );
    return result;
  }

  /** 운영 확인용 수집 통계(dedup/raw_logs 건수). */
  @Get('stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '수집 통계 조회' })
  async stats() {
    return this.ingestService.stats();
  }
}
