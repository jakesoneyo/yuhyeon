import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/** 전역 모듈로 등록해 각 기능 모듈에서 매번 imports 하지 않고 PrismaService를 주입받게 한다. */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
