import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

import { ActionExecutionService } from '../actions/action-execution.service';

@Injectable()
export class AgentExecutionService {
  constructor(private readonly moduleRef: ModuleRef) {}

  async executeApprovedProposal(proposalId: string, actorUserId?: string | null) {
    const actionExecutionService = this.moduleRef.get(ActionExecutionService, {
      strict: false,
    });

    if (!actionExecutionService) {
      return null;
    }

    return actionExecutionService.executeProposal(proposalId, actorUserId);
  }
}
