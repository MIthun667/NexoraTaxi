import { IsUUID } from 'class-validator';

export class GenerateFleetReadinessExplanationDto {
  @IsUUID()
  vehicleId!: string;
}
