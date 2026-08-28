import { Injectable } from '@nestjs/common';
import { Prisma, WorkforceStatusCategory } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import {
  CREDENTIAL_DOCUMENT_SELECT,
  WORKFORCE_MEMBER_SELECT,
  WORKFORCE_STATUS_HISTORY_SELECT,
} from './mappers/workforce.mapper';

@Injectable()
export class WorkforceRepository {
  constructor(private readonly prismaService: PrismaService) {}

  createMember(data: Prisma.WorkforceMemberCreateInput) {
    return this.prismaService.workforceMember.create({
      data,
      select: WORKFORCE_MEMBER_SELECT,
    });
  }

  updateMember(id: string, data: Prisma.WorkforceMemberUpdateInput) {
    return this.prismaService.workforceMember.update({
      where: { id },
      data,
      select: WORKFORCE_MEMBER_SELECT,
    });
  }

  findMemberById(id: string) {
    return this.prismaService.workforceMember.findFirst({
      where: { id, deletedAt: null },
      select: WORKFORCE_MEMBER_SELECT,
    });
  }

  findMemberWithRelations(id: string) {
    return this.prismaService.workforceMember.findFirst({
      where: { id, deletedAt: null },
      select: {
        ...WORKFORCE_MEMBER_SELECT,
        credentialDocuments: {
          select: CREDENTIAL_DOCUMENT_SELECT,
          orderBy: [{ createdAt: 'desc' }],
          take: 5,
        },
        statusHistory: {
          select: WORKFORCE_STATUS_HISTORY_SELECT,
          orderBy: [{ effectiveAt: 'desc' }],
          take: 10,
        },
      },
    });
  }

  listMembers(where: Prisma.WorkforceMemberWhereInput, skip: number, take: number) {
    return this.prismaService.workforceMember.findMany({
      where,
      select: WORKFORCE_MEMBER_SELECT,
      orderBy: [{ createdAt: 'desc' }],
      skip,
      take,
    });
  }

  countMembers(where: Prisma.WorkforceMemberWhereInput) {
    return this.prismaService.workforceMember.count({ where });
  }

  createStatusHistory(data: Prisma.WorkforceStatusHistoryCreateInput) {
    return this.prismaService.workforceStatusHistory.create({
      data,
      select: WORKFORCE_STATUS_HISTORY_SELECT,
    });
  }

  listStatusHistory(workforceMemberId: string) {
    return this.prismaService.workforceStatusHistory.findMany({
      where: { workforceMemberId },
      select: WORKFORCE_STATUS_HISTORY_SELECT,
      orderBy: [{ effectiveAt: 'desc' }],
    });
  }

  createCredential(data: Prisma.CredentialDocumentCreateInput) {
    return this.prismaService.credentialDocument.create({
      data,
      select: CREDENTIAL_DOCUMENT_SELECT,
    });
  }

  findCredentialById(id: string) {
    return this.prismaService.credentialDocument.findUnique({
      where: { id },
      select: CREDENTIAL_DOCUMENT_SELECT,
    });
  }

  updateCredential(id: string, data: Prisma.CredentialDocumentUpdateInput) {
    return this.prismaService.credentialDocument.update({
      where: { id },
      data,
      select: CREDENTIAL_DOCUMENT_SELECT,
    });
  }

  listCredentials(workforceMemberId: string) {
    return this.prismaService.credentialDocument.findMany({
      where: { workforceMemberId },
      select: CREDENTIAL_DOCUMENT_SELECT,
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  getReadinessCounts(organizationId: string) {
    return this.prismaService.$transaction([
      this.prismaService.workforceMember.count({
        where: { organizationId, deletedAt: null, operationalStatus: 'ACTIVE' },
      }),
      this.prismaService.workforceMember.count({
        where: { organizationId, deletedAt: null, complianceStatus: 'COMPLIANT' },
      }),
      this.prismaService.workforceMember.count({
        where: { organizationId, deletedAt: null, availabilityStatus: 'AVAILABLE' },
      }),
      this.prismaService.credentialDocument.count({
        where: {
          organizationId,
          expiresAt: {
            lte: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
          },
        },
      }),
    ]);
  }

  runInTransaction<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>) {
    return this.prismaService.$transaction(callback);
  }

  updateMemberStatus(
    tx: Prisma.TransactionClient,
    id: string,
    category: WorkforceStatusCategory,
    nextValue: string,
  ) {
    if (category === WorkforceStatusCategory.OPERATIONAL_STATUS) {
      return tx.workforceMember.update({
        where: { id },
        data: { operationalStatus: nextValue as never },
      });
    }

    if (category === WorkforceStatusCategory.COMPLIANCE_STATUS) {
      return tx.workforceMember.update({
        where: { id },
        data: { complianceStatus: nextValue as never },
      });
    }

    return tx.workforceMember.update({
      where: { id },
      data: { availabilityStatus: nextValue as never },
    });
  }
}
