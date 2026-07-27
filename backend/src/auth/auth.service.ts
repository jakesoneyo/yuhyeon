import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

export interface JwtPayload {
  sub: string;
  username: string;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * 일반 회원가입. username(이메일) 유니크를 DB 제약으로도 이중 방어하고,
   * 비밀번호는 argon2로 해시해 저장한다(평문 저장 금지).
   * @throws ConflictException username 중복 시
   */
  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });
    if (existing) {
      throw new ConflictException('username already registered');
    }

    const passwordHash = await argon2.hash(dto.password);
    const user = await this.prisma.user.create({
      data: { username: dto.username, passwordHash },
    });

    return { id: user.id, username: user.username, role: user.role };
  }

  /**
   * 로그인. 데모 계정('admin')도 다른 사용자와 동일하게 argon2 비교를 통과해야 한다 —
   * username 형식 예외(LoginDto)는 검증 레이어에만 있을 뿐 여기선 백도어를 두지 않는다.
   * @throws UnauthorizedException 사용자 없음/비밀번호 불일치
   */
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await argon2.verify(
      user.passwordHash,
      dto.password,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      user: { id: user.id, username: user.username, role: user.role },
    };
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }
    return { id: user.id, username: user.username, role: user.role };
  }
}
