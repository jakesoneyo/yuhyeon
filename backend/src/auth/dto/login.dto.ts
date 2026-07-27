import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { IsLoginUsername } from '../decorators/is-login-username.decorator';

/** 로그인 요청. username은 이메일 형식이 원칙이나 데모 계정 'admin' 리터럴만 예외 허용. */
export class LoginDto {
  @ApiProperty({
    example: 'admin',
    description: "이메일 형식 원칙, 데모 계정 'admin' 리터럴만 예외",
  })
  @IsLoginUsername()
  username!: string;

  @ApiProperty({ example: 'admin' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
