import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

/** 운영 헬스체크. 배포 플랫폼(Render 등)의 liveness/readiness probe가 호출한다. */
@ApiTags('health')
@Controller('api/health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'DB 핑을 포함한 헬스체크' })
  async check() {
    const dbUp = await this.prisma.ping();
    return {
      ok: dbUp,
      service: 'backend',
      db: dbUp ? 'up' : 'down',
      timestamp: new Date().toISOString(),
    };
  }
}
