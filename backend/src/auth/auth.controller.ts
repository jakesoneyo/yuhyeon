import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

/** "사람 경계" 인증 API. register/login은 공개, me는 JwtAuthGuard 보호. */
@ApiTags('auth')
@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** 일반 회원가입. admin 예외 없이 실제 이메일 형식만 허용(RegisterDto). */
  @Post('register')
  @ApiOperation({ summary: '회원가입 (이메일 형식 강제)' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  /** 로그인. 데모 계정 'admin'만 이메일 형식 예외, 비밀번호 검증은 항상 정상 수행. */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '로그인 (JWT 발급)' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /** 현재 로그인한 사용자 정보. */
  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '내 정보 조회' })
  me(@Request() req: { user: { id: string; username: string; role: string } }) {
    return req.user;
  }
}
