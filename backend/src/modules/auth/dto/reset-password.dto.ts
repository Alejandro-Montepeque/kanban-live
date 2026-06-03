import { IsString, Matches, MaxLength, MinLength } from 'class-validator'

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,128}$/

export class ResetPasswordDto {
  @IsString()
  @MinLength(20)
  @MaxLength(255)
  token!: string

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(PASSWORD_REGEX, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter and one number',
  })
  password!: string
}
