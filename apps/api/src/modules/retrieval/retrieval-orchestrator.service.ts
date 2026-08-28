import { Injectable } from '@nestjs/common';

import { PlatformLoggerService } from '../../common/services/platform-logger.service';
import { mergeRetrievalProviderResults } from './mappers/retrieval-bundle.mapper';
import { RETRIEVAL_PROVIDER_TIMEOUT_MS } from './retrieval.constants';
import { RetrievalPoliciesService } from './retrieval-policies.service';
import { RetrievalRegistryService } from './retrieval-registry.service';
import { RetrievalRepository } from './retrieval.repository';
import { RetrievalBundle, RetrievalContext, RetrievalRequest } from './retrieval.types';

@Injectable()
export class RetrievalOrchestratorService {
  constructor(
    private readonly retrievalRegistryService: RetrievalRegistryService,
    private readonly retrievalPoliciesService: RetrievalPoliciesService,
    private readonly retrievalRepository: RetrievalRepository,
    private readonly logger: PlatformLoggerService,
  ) {}

  async buildBundle(request: RetrievalRequest): Promise<RetrievalBundle> {
    const providers = this.retrievalRegistryService.getProvidersForRequest(request);
    const context: RetrievalContext = {
      request,
      startedAt: new Date(),
      timeoutMs: this.retrievalPoliciesService.getTimeoutBudget(),
    };

    const results = [];
    for (const provider of providers) {
      const providerStartedAt = Date.now();
      try {
        const result = await Promise.race([
          provider.retrieve(context),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Provider ${provider.name} timed out.`)), RETRIEVAL_PROVIDER_TIMEOUT_MS),
          ),
        ]);
        results.push(result);
        this.logger.debug({
          event: 'retrieval.provider.completed',
          provider: provider.name,
          targetEntityType: request.targetEntityType,
          targetEntityId: request.targetEntityId ?? null,
          durationMs: Date.now() - providerStartedAt,
        });
      } catch (error) {
        results.push({
          contextNotes: [
            `${provider.name} retrieval failed: ${error instanceof Error ? error.message : 'Unknown retrieval failure'}`,
          ],
        });
        this.logger.warn({
          event: 'retrieval.provider.failed',
          provider: provider.name,
          targetEntityType: request.targetEntityType,
          targetEntityId: request.targetEntityId ?? null,
          reason: error instanceof Error ? error.message : 'Unknown retrieval failure',
        });
      }
    }

    const sharedHistory = await this.collectSharedHistory(request);
    const bundle = mergeRetrievalProviderResults([...results, sharedHistory]);
    return this.retrievalPoliciesService.finalizeBundle(bundle, request);
  }

  private async collectSharedHistory(request: RetrievalRequest) {
    if (!request.targetEntityId) {
      return { contextNotes: ['Shared history retrieval skipped because no target entity was provided.'] };
    }

    const aggregateTypeMap: Record<string, string> = {
      'workforce-member': 'workforce-member',
      asset: 'asset',
      'work-order': 'work-order',
      'operational-zone': 'operational-zone',
      'schedule-plan': 'schedule-plan',
      'schedule-shift': 'schedule-shift',
      'operational-incident': 'operational-incident',
      'resource-assignment': 'resource-assignment',
    };

    const entityTypeMap: Record<string, string> = {
      'workforce-member': 'workforce-member',
      asset: 'asset',
      'work-order': 'work-order',
      'operational-zone': 'operational-zone',
      'schedule-plan': 'schedule-plan',
      'schedule-shift': 'schedule-shift',
      'operational-incident': 'operational-incident',
      'resource-assignment': 'resource-assignment',
    };

    const aggregateType = aggregateTypeMap[request.targetEntityType];
    const entityType = entityTypeMap[request.targetEntityType];

    if (!aggregateType || !entityType) {
      return { contextNotes: [`No shared history mapping was found for ${request.targetEntityType}.`] };
    }

    const [domainEvents, approvals, auditLogs] = await Promise.all([
      this.retrievalRepository.getDomainEventsForEntity(
        request.organizationId,
        aggregateType,
        request.targetEntityId,
        request.maxRecords ?? 25,
      ),
      this.retrievalRepository.getApprovalsForEntity(
        request.organizationId,
        entityType,
        request.targetEntityId,
        request.maxRecords ?? 25,
      ),
      this.retrievalRepository.getAuditLogsForEntity(
        request.organizationId,
        entityType,
        request.targetEntityId,
        request.maxRecords ?? 25,
      ),
    ]);

    return {
      timelineEvents: [
        ...domainEvents.map((event) => ({
          eventType: event.eventType,
          aggregateType: event.aggregateType,
          aggregateId: event.aggregateId,
          occurredAt: event.occurredAt,
        })),
        ...approvals.map((approval) => ({
          eventType: 'approval_request',
          approvalRequestId: approval.id,
          status: approval.status,
          title: approval.title,
          occurredAt: approval.createdAt,
        })),
        ...auditLogs.map((log) => ({
          eventType: 'audit_log',
          action: log.action,
          summary: log.summary,
          occurredAt: log.createdAt,
        })),
      ],
      operationalMetrics: [
        { key: 'domain_event_count', label: 'Domain events', value: domainEvents.length },
        { key: 'approval_count', label: 'Approvals', value: approvals.length },
        { key: 'audit_log_count', label: 'Audit logs', value: auditLogs.length },
      ],
    };
  }
}
