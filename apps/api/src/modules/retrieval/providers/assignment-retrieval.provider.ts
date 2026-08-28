import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';
import { RetrievalContext, RetrievalProvider, RetrievalProviderResult } from '../retrieval.types';

@Injectable()
export class AssignmentRetrievalProvider implements RetrievalProvider {
  readonly name = 'assignments';

  constructor(private readonly prismaService: PrismaService) {}

  supports(request: RetrievalContext['request']): boolean {
    return request.targetEntityType === 'resource-assignment';
  }

  async retrieve(context: RetrievalContext): Promise<RetrievalProviderResult> {
    const { organizationId, targetEntityId, maxRecords, includeRelated } = context.request;

    if (!targetEntityId) {
      return { contextNotes: ['Assignment retrieval skipped because targetEntityId was not provided.'] };
    }

    const assignment = await this.prismaService.resourceAssignment.findFirst({
      where: { id: targetEntityId, organizationId },
      include: {
        workforceMember: includeRelated ? true : false,
        asset: includeRelated ? true : false,
        shift: includeRelated ? true : false,
        workOrder: includeRelated ? true : false,
        zone: includeRelated ? true : false,
      },
    });

    if (!assignment) {
      return { contextNotes: ['No assignment was found for the requested scope.'] };
    }

    const conflictMatches = await this.prismaService.resourceAssignment.findMany({
      where: {
        organizationId,
        id: { not: assignment.id },
        status: { in: ['PLANNED', 'ASSIGNED', 'ACTIVE'] },
        OR: [
          ...(assignment.workforceMemberId ? [{ workforceMemberId: assignment.workforceMemberId }] : []),
          ...(assignment.assetId ? [{ assetId: assignment.assetId }] : []),
        ],
      },
      orderBy: [{ assignedAt: 'desc' }],
      take: maxRecords,
      select: {
        id: true,
        status: true,
        workforceMemberId: true,
        assetId: true,
        shiftId: true,
        workOrderId: true,
        assignedAt: true,
      },
    });

    return {
      entitySnapshot: {
        id: assignment.id,
        assignmentType: assignment.assignmentType,
        status: assignment.status,
        workforceMemberId: assignment.workforceMemberId,
        assetId: assignment.assetId,
        shiftId: assignment.shiftId,
        workOrderId: assignment.workOrderId,
        zoneId: assignment.zoneId,
        assignedAt: assignment.assignedAt,
        releasedAt: assignment.releasedAt,
      },
      relatedEntities: [
        ...(assignment.workforceMember ? [{ entityType: 'workforce-member', id: assignment.workforceMember.id, displayName: assignment.workforceMember.displayName }] : []),
        ...(assignment.asset ? [{ entityType: 'asset', id: assignment.asset.id, name: assignment.asset.name }] : []),
        ...(assignment.shift ? [{ entityType: 'schedule-shift', id: assignment.shift.id, title: assignment.shift.title, status: assignment.shift.status }] : []),
        ...(assignment.workOrder ? [{ entityType: 'work-order', id: assignment.workOrder.id, title: assignment.workOrder.title, status: assignment.workOrder.status }] : []),
        ...(assignment.zone ? [{ entityType: 'operational-zone', id: assignment.zone.id, name: assignment.zone.name }] : []),
      ],
      timelineEvents: conflictMatches.map((match) => ({
        eventType: 'assignment_conflict_candidate',
        assignmentId: match.id,
        status: match.status,
        assignedAt: match.assignedAt,
      })),
      operationalMetrics: [
        { key: 'conflict_candidate_count', label: 'Conflict candidates', value: conflictMatches.length },
      ],
      riskSignals: [
        ...(conflictMatches.length > 0
          ? [{ code: 'ASSIGNMENT_CONFLICT_RISK', severity: 'HIGH' as const, message: 'Potential assignment conflicts detected.' }]
          : []),
      ],
    };
  }
}
