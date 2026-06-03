import { IsNumber, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class UpdateColumnDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name?: string

  // Position in the column ordering (fractional indexing).
  @IsOptional()
  @IsNumber()
  position?: number
}
