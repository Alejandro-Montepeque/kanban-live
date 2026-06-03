import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator'

export class CreateInvitationDto {
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string

  // If true, sends an email to the address via the MailerService.
  @IsOptional()
  sendEmail?: boolean
}
