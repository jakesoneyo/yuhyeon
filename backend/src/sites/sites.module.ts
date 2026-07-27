import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SitesController } from './sites.controller';
import { SitesService } from './sites.service';

// AuthModule을 명시적으로 import해 이 모듈이 JwtAuthGuard(Passport 'jwt' 전략)에 의존함을
// 드러낸다. JwtStrategy는 AppModule에서 이미 인스턴스화되지만, SitesModule만 따로 떼어봐도
// 의존 관계가 코드로 보이게 하기 위함(암묵적 전역 등록에 기대지 않음).
@Module({
  imports: [AuthModule],
  controllers: [SitesController],
  providers: [SitesService],
})
export class SitesModule {}
