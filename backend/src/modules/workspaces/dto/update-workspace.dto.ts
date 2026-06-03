import { IsString, MaxLength, MinLength } from 'class-validator'

export class UpdateWorkspaceDto {
  @IsString()
  @MinLength(1, { message: 'Workspace name cannot be empty' })
  @MaxLength(80)
  name!: string
}
