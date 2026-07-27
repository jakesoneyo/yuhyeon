import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  isEmail,
} from 'class-validator';

/**
 * 로그인 전용 username(이메일) 형식 검증.
 *
 * 포트폴리오 데모 목적으로, 리터럴 문자열 'admin' 딱 하나만 이메일 형식 검증을
 * 우회하도록 허용한다(면접관이 실제 이메일 없이 시드된 데모 관리자 계정으로 바로
 * 로그인해볼 수 있게 하기 위함). 이 예외는 LoginDto에만 적용되며, 다른 어떤 문자열도
 * 느슨하게 허용하지 않는다 — 비밀번호 검증(argon2 비교)은 AuthService.login에서
 * 그대로 수행되므로 인증 우회(백도어)가 아니다. RegisterDto에는 절대 적용하지 않는다.
 */
@ValidatorConstraint({ name: 'isLoginUsername', async: false })
export class IsLoginUsernameConstraint implements ValidatorConstraintInterface {
  validate(value: unknown) {
    if (value === 'admin') {
      return true;
    }
    return typeof value === 'string' && isEmail(value);
  }

  defaultMessage() {
    return '유효한 이메일 형식이어야 합니다.';
  }
}

export function IsLoginUsername(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsLoginUsernameConstraint,
    });
  };
}
