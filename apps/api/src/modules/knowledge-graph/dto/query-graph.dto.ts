import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class QueryGraphDto {
  @IsUUID()
  organizationId!: string;

  @IsString()
  targetEntityType!: string;

  @IsOptional()
  @IsString()
  targetEntityId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  maxDepth?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  maxNodes?: number;

  @IsOptional()
  @IsBoolean()
  includeInsights?: boolean;
}
