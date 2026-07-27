import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, MinLength } from 'class-validator';

/** 일반 회원가입 요청. admin 예외 없이 항상 실제 이메일 형식만 허용한다. */
export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  username!: string;

  @ApiProperty({ example: 'min8chars', minLength: 8 })
  @MinLength(8)
  password!: string;
}
