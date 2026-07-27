import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardQueryDto } from './dto/dashboard-query.dto';
import { LogsQueryDto } from './dto/logs-query.dto';
import { SitesService } from './sites.service';

/**
 * "사람 경계" 대시보드 API. 에이전트용 AgentAuthGuard(x-api-key+HMAC)와는 별개로,
 * 여기 전 라우트는 로그인한 사용자만 호출 가능한 JwtAuthGuard로 보호한다.
 */
@ApiTags('sites')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/sites')
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  /** 현장 목록 + 수신 요약(F6). 지도·사이드바·목록에서 공용으로 사용. */
  @Get()
  @ApiOperation({ summary: '현장 목록 및 수신 요약' })
  getSites() {
    return this.sitesService.getSites();
  }

  /** 현장 상세 대시보드 스냅샷(F7): KPI·추이 시계열·경보·최근 로그. */
  @Get(':code/dashboard')
  @ApiOperation({ summary: '현장 대시보드 스냅샷' })
  getDashboard(@Param('code') code: string, @Query() query: DashboardQueryDto) {
    return this.sitesService.getDashboard(code, query.window);
  }

  /** 원시 로그 커서 페이지네이션(F9, 디버깅/감사용). */
  @Get(':code/logs')
  @ApiOperation({ summary: '원시 로그 커서 페이지네이션' })
  getLogs(@Param('code') code: string, @Query() query: LogsQueryDto) {
    return this.sitesService.getLogs(code, query.cursor, query.limit);
  }
}
