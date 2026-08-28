import { IsUUID } from 'class-validator';

export class RebuildCrmProfilesDto {
  @IsUUID()
  organizationId!: string;
}
