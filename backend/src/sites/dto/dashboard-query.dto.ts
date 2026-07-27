import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export const DASHBOARD_WINDOWS = ['1h', '24h', '7d'] as const;
export type DashboardWindow = (typeof DASHBOARD_WINDOWS)[number];

/** 현장 대시보드 조회 범위. 기본값은 서비스에서 '24h'로 처리한다(API.md). */
export class DashboardQueryDto {
  @ApiPropertyOptional({ enum: DASHBOARD_WINDOWS, default: '24h' })
  @IsOptional()
  @IsIn(DASHBOARD_WINDOWS)
  window?: DashboardWindow;
}
