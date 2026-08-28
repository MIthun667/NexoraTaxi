import { Injectable } from '@nestjs/common';

import { ActionRegistryService } from './action-registry.service';
import { ActionExecutionContext, ActionExecutionRequest } from './action.types';

@Injectable()
export class ActionDispatcherService {
  constructor(private readonly actionRegistryService: ActionRegistryService) {}

  dispatch(request: ActionExecutionRequest, context: ActionExecutionContext) {
    const handler = this.actionRegistryService.getHandler(request.actionType);
    return handler.execute(request, context);
  }
}
