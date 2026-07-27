import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** "사람 경계" 인증 가드. Passport 'jwt' 전략(JwtStrategy)에 위임한다. */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
