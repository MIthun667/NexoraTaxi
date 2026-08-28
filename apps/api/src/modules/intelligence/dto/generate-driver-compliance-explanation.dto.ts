import { IsUUID } from 'class-validator';

export class GenerateDriverComplianceExplanationDto {
  @IsUUID()
  driverId!: string;
}
