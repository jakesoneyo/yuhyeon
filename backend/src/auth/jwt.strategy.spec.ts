import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';

/**
 * JwtAuthGuard가 위임하는 Passport 'jwt' 전략의 인가 판정 로직 단위 테스트.
 * 유효한 payload.sub의 사용자가 실제로 존재해야만 통과시키는지(탈퇴 계정 차단)를 검증한다.
 */
describe('JwtStrategy', () => {
  const originalSecret = process.env.JWT_SECRET;

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-jwt-secret';
  });

  afterAll(() => {
    process.env.JWT_SECRET = originalSecret;
  });

  it('payload.sub에 해당하는 사용자가 있으면 그 사용자를 반환한다', async () => {
    const user = { id: 'user-1', username: 'admin', role: 'ADMIN' };
    const authService = {
      findById: jest.fn().mockResolvedValue(user),
    } as unknown as AuthService;
    const strategy = new JwtStrategy(authService);

    const result = await strategy.validate({
      sub: 'user-1',
      username: 'admin',
      role: 'ADMIN',
    });

    expect(result).toEqual(user);
  });

  it('사용자가 존재하지 않으면(탈퇴 등) 401을 던진다', async () => {
    const authService = {
      findById: jest.fn().mockRejectedValue(new UnauthorizedException()),
    } as unknown as AuthService;
    const strategy = new JwtStrategy(authService);

    await expect(
      strategy.validate({ sub: 'gone', username: 'x', role: 'USER' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
