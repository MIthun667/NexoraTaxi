import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';
import { RetrievalProvider, RetrievalContext, RetrievalProviderResult } from '../retrieval.types';

@Injectable()
export class WorkforceRetrievalProvider implements RetrievalProvider {
  readonly name = 'workforce';

  constructor(private readonly prismaService: PrismaService) {}

  supports(request: RetrievalContext['request']): boolean {
    return request.targetEntityType === 'workforce-member';
  }

  async retrieve(context: RetrievalContext): Promise<RetrievalProviderResult> {
    const { organizationId, targetEntityId, maxRecords, includeRelated } = context.request;

    if (!targetEntityId) {
      return { contextNotes: ['Workforce retrieval skipped because targetEntityId was not provided.'] };
    }

    const member = await this.prismaService.workforceMember.findFirst({
      where: { id: targetEntityId, organizationId, deletedAt: null },
      include: {
        credentialDocuments: {
          orderBy: [{ expiresAt: 'asc' }, { createdAt: 'desc' }],
          take: maxRecords,
        },
        statusHistory: {
          orderBy: [{ effectiveAt: 'desc' }],
          take: maxRecords,
        },
        assignments: includeRelated
          ? {
              orderBy: [{ assignedAt: 'desc' }],
              take: maxRecords,
            }
          : false,
      },
    });

    if (!member) {
      return { contextNotes: ['No workforce member was found for the requested scope.'] };
    }

    const expiringCredentials = member.credentialDocuments.filter(
      (document) => document.expiresAt && document.expiresAt.getTime() <= Date.now() + 30 * 24 * 60 * 60 * 1000,
    ).length;

    return {
      entitySnapshot: {
        id: member.id,
        workerCode: member.workerCode,
        displayName: member.displayName,
        workerType: member.workerType,
        operationalStatus: member.operationalStatus,
        complianceStatus: member.complianceStatus,
        availabilityStatus: member.availabilityStatus,
        primaryDepartmentId: member.primaryDepartmentId,
        primaryPositionId: member.primaryPositionId,
        homeZoneId: member.homeZoneId,
        createdAt: member.createdAt,
        updatedAt: member.updatedAt,
      },
      relatedEntities: [
        ...member.credentialDocuments.map((document) => ({
          entityType: 'credential-document',
          id: document.id,
          documentType: document.documentType,
          verificationStatus: document.verificationStatus,
          expiresAt: document.expiresAt,
        })),
        ...(member.assignments ?? []).map((assignment) => ({
          entityType: 'resource-assignment',
          id: assignment.id,
          status: assignment.status,
          workOrderId: assignment.workOrderId,
          shiftId: assignment.shiftId,
          assetId: assignment.assetId,
        })),
      ],
      timelineEvents: member.statusHistory.map((entry) => ({
        eventType: 'workforce_status_history',
        category: entry.category,
        previousValue: entry.previousValue,
        nextValue: entry.nextValue,
        reason: entry.reason,
        occurredAt: entry.effectiveAt,
      })),
      operationalMetrics: [
        {
          key: 'credential_count',
          label: 'Credential count',
          value: member.credentialDocuments.length,
        },
        {
          key: 'expiring_credentials_30d',
          label: 'Credentials expiring within 30 days',
          value: expiringCredentials,
        },
      ],
      riskSignals: [
        ...(member.complianceStatus !== 'COMPLIANT'
          ? [{ code: 'WORKFORCE_COMPLIANCE_RISK', severity: 'HIGH' as const, message: 'Workforce member is not compliant.' }]
          : []),
        ...(member.availabilityStatus !== 'AVAILABLE'
          ? [{ code: 'WORKFORCE_AVAILABILITY_RISK', severity: 'MEDIUM' as const, message: 'Workforce member is not currently available.' }]
          : []),
      ],
    };
  }
}
