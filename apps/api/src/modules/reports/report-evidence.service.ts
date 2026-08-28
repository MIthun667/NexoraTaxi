import { Injectable } from '@nestjs/common';

import { ReportEvidenceBundle } from './reports.types';

@Injectable()
export class ReportEvidenceService {
  buildEvidence(run: {
    observations: Array<{ id: string; observationType: string; summary: string; metadata: unknown; createdAt: Date }>;
    decisions: Array<{ id: string; decisionType: string; summary: string; confidence: string; metadata: unknown; createdAt: Date }>;
    actionProposals: Array<{ id: string; actionType: string; summary: string; status: string; riskLevel: string; createdAt: Date }>;
    verificationResults: Array<{ id: string; verificationType: string; verificationStatus: string; summary: string; details: unknown; createdAt: Date }>;
    inferenceAuditLogs: Array<{ id: string; useCase: string; status: string; latencyMs: number | null; createdAt: Date }>;
  }): ReportEvidenceBundle {
    const observations = run.observations.map((item) => ({
      id: item.id,
      observationType: item.observationType,
      summary: item.summary,
      metadata: item.metadata,
      createdAt: item.createdAt,
    }));

    return {
      observations,
      decisions: run.decisions.map((item) => ({
        id: item.id,
        decisionType: item.decisionType,
        summary: item.summary,
        confidence: item.confidence,
        metadata: item.metadata,
        createdAt: item.createdAt,
      })),
      proposals: run.actionProposals.map((item) => ({
        id: item.id,
        actionType: item.actionType,
        summary: item.summary,
        status: item.status,
        riskLevel: item.riskLevel,
        createdAt: item.createdAt,
      })),
      verificationResults: run.verificationResults.map((item) => ({
        id: item.id,
        verificationType: item.verificationType,
        verificationStatus: item.verificationStatus,
        summary: item.summary,
        details: item.details,
        createdAt: item.createdAt,
      })),
      inferenceAudits: run.inferenceAuditLogs.map((item) => ({
        id: item.id,
        useCase: item.useCase,
        status: item.status,
        latencyMs: item.latencyMs,
        createdAt: item.createdAt,
      })),
      skillResults: observations
        .filter((item) => Boolean((item.metadata as Record<string, unknown> | null)?.skillId))
        .map((item) => item.metadata as Record<string, unknown>),
    };
  }
}
