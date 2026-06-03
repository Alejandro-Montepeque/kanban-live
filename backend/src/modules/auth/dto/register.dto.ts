import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator'

// Password rules:
// - 8+ characters
// - at least one lowercase
// - at least one uppercase
// - at least one number
// Special characters are encouraged but not required to avoid frustrating users
// on mobile keyboards. Argon2 + length is what really matters here.
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,128}$/

export class RegisterDto {
  @IsEmail()
  @MaxLength(255)
  email!: string

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128)
  @Matches(PASSWORD_REGEX, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter and one number',
  })
  password!: string
}
