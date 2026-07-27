import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { LoginDto } from './login.dto';
import { RegisterDto } from './register.dto';

/**
 * 로그인 데모 예외('admin' 리터럴만 이메일 형식 우회)와 회원가입 이메일 강제를
 * class-validator 파이프라인 레벨에서 검증한다(SPEC.md §5).
 */
describe('LoginDto / RegisterDto validation', () => {
  it("LoginDto는 username='admin'이면 이메일 형식이 아니어도 통과한다", async () => {
    const dto = plainToInstance(LoginDto, {
      username: 'admin',
      password: 'admin',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('LoginDto는 admin이 아닌 비-이메일 문자열을 거부한다', async () => {
    const dto = plainToInstance(LoginDto, {
      username: 'not-an-email',
      password: 'password123',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('LoginDto는 실제 이메일 형식이면 통과한다', async () => {
    const dto = plainToInstance(LoginDto, {
      username: 'user@example.com',
      password: 'password123',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it("RegisterDto는 'admin' 리터럴이어도 예외 없이 이메일 형식을 강제한다", async () => {
    const dto = plainToInstance(RegisterDto, {
      username: 'admin',
      password: 'password123',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('RegisterDto는 실제 이메일 형식이면 통과한다', async () => {
    const dto = plainToInstance(RegisterDto, {
      username: 'user@example.com',
      password: 'password123',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
