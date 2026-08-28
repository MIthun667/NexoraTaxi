import { Injectable } from '@nestjs/common';

import { CreateIncidentActionDto } from '../../incidents/dto/create-incident-action.dto';
import { ResolveIncidentDto } from '../../incidents/dto/resolve-incident.dto';
import { UpdateOperationalIncidentDto } from '../../incidents/dto/update-operational-incident.dto';
import { IncidentsService } from '../../incidents/incidents.service';
import { ActionTypes } from '../action.constants';
import { ActionExecutionContext, ActionExecutionRequest, ActionExecutionResult, ActionHandler } from '../action.types';

@Injectable()
export class IncidentActionHandler implements ActionHandler {
  constructor(private readonly incidentsService: IncidentsService) {}

  supportedActionTypes() {
    return [ActionTypes.ESCALATE_INCIDENT, ActionTypes.RESOLVE_INCIDENT, ActionTypes.ASSIGN_INCIDENT];
  }

  async execute(request: ActionExecutionRequest, context: ActionExecutionContext): Promise<ActionExecutionResult> {
    if (request.actionType === ActionTypes.ESCALATE_INCIDENT) {
      const dto: CreateIncidentActionDto = {
        actionType: 'ESCALATE',
        summary: (request.payload?.summary as string | undefined) ?? request.summary,
        metadata: (request.payload?.metadata as Record<string, unknown> | undefined) ?? undefined,
      };
      await this.incidentsService.addAction(request.targetEntityId!, context.actorUserId ?? undefined, dto);
      return { success: true, executionStatus: 'SUCCEEDED', resultSummary: 'Incident escalated successfully.', entityType: 'operational-incident', entityId: request.targetEntityId };
    }

    if (request.actionType === ActionTypes.RESOLVE_INCIDENT) {
      const dto = request.payload as unknown as ResolveIncidentDto;
      await this.incidentsService.resolve(request.targetEntityId!, context.actorUserId ?? undefined, dto);
      return { success: true, executionStatus: 'SUCCEEDED', resultSummary: 'Incident resolved successfully.', entityType: 'operational-incident', entityId: request.targetEntityId };
    }

    const dto = request.payload as unknown as UpdateOperationalIncidentDto;
    await this.incidentsService.update(request.targetEntityId!, dto);
    return { success: true, executionStatus: 'SUCCEEDED', resultSummary: 'Incident assignment updated successfully.', entityType: 'operational-incident', entityId: request.targetEntityId };
  }
}
