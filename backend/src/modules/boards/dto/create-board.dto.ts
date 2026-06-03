import { IsString, MaxLength, MinLength } from 'class-validator'

export class CreateBoardDto {
  @IsString()
  @MinLength(1, { message: 'Board name is required' })
  @MaxLength(80)
  name!: string
}
