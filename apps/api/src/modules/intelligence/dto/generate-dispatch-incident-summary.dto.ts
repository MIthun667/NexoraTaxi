import { IsUUID } from 'class-validator';

export class GenerateDispatchIncidentSummaryDto {
  @IsUUID()
  incidentId!: string;
}
