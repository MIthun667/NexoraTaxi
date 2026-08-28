import { Type } from 'class-transformer';
import { IsInt, IsObject, IsOptional, Min } from 'class-validator';

export class AllocateShiftCapacityDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  capacityRequired?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  capacityAllocated?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
