import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { HealthController } from './health/health.controller';
import { IngestModule } from './ingest/ingest.module';
import { PrismaModule } from './prisma/prisma.module';
import { SitesModule } from './sites/sites.module';

@Module({
  imports: [PrismaModule, IngestModule, AuthModule, SitesModule],
  controllers: [HealthController],
})
export class AppModule {}
