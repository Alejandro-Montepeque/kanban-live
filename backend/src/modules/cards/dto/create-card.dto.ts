import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class CreateCardDto {
  @IsString()
  @MinLength(1, { message: 'Card title is required' })
  @MaxLength(200)
  title!: string

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string
}
