import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Prisma 커넥션 라이프사이클을 Nest DI에 맞춰 관리한다.
 * 모듈 초기화 시 연결하고, 종료 시 반드시 해제해 커넥션 누수를 막는다.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /** 헬스체크용 DB 핑. 실패 시 예외를 던지지 않고 boolean으로 알린다(호출부에서 상태 매핑). */
  async ping(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error(
        'DB ping failed',
        error instanceof Error ? error.stack : error,
      );
      return false;
    }
  }
}
