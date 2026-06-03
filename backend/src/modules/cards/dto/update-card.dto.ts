import { IsDateString, IsNumber, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class UpdateCardDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string

  @IsOptional()
  @IsString()
  columnId?: string

  @IsOptional()
  @IsNumber()
  position?: number

  @IsOptional()
  @IsString()
  assigneeId?: string | null

  @IsOptional()
  @IsDateString()
  dueDate?: string | null
}
