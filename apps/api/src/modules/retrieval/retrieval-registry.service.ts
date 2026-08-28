import { Injectable } from '@nestjs/common';

import { AssignmentRetrievalProvider } from './providers/assignment-retrieval.provider';
import { AssetRetrievalProvider } from './providers/asset-retrieval.provider';
import { IncidentRetrievalProvider } from './providers/incident-retrieval.provider';
import { KnowledgeGraphRetrievalProvider } from './providers/knowledge-graph-retrieval.provider';
import { OperationsRetrievalProvider } from './providers/operations-retrieval.provider';
import { SchedulingRetrievalProvider } from './providers/scheduling-retrieval.provider';
import { WorkforceRetrievalProvider } from './providers/workforce-retrieval.provider';
import { RetrievalProvider, RetrievalRequest } from './retrieval.types';

@Injectable()
export class RetrievalRegistryService {
  private readonly providers: RetrievalProvider[];

  constructor(
    workforceRetrievalProvider: WorkforceRetrievalProvider,
    assetRetrievalProvider: AssetRetrievalProvider,
    operationsRetrievalProvider: OperationsRetrievalProvider,
    schedulingRetrievalProvider: SchedulingRetrievalProvider,
    incidentRetrievalProvider: IncidentRetrievalProvider,
    assignmentRetrievalProvider: AssignmentRetrievalProvider,
    knowledgeGraphRetrievalProvider: KnowledgeGraphRetrievalProvider,
  ) {
    this.providers = [
      workforceRetrievalProvider,
      assetRetrievalProvider,
      operationsRetrievalProvider,
      schedulingRetrievalProvider,
      incidentRetrievalProvider,
      assignmentRetrievalProvider,
      knowledgeGraphRetrievalProvider,
    ];
  }

  getProvidersForRequest(request: RetrievalRequest) {
    return this.providers.filter((provider) => provider.supports(request));
  }
}
