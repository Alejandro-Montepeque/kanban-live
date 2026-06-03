import { IsString, MaxLength, MinLength } from 'class-validator'

export class CreateWorkspaceDto {
  @IsString()
  @MinLength(1, { message: 'Workspace name is required' })
  @MaxLength(80)
  name!: string
}
