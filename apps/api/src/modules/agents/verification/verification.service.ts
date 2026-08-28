import { AgentRunStatus, AgentVerificationStatus, AgentVerificationType } from '@prisma/client';
import { Injectable, NotFoundException } from '@nestjs/common';

import { AuditService } from '../../audit/audit.service';
import { AiObservabilityService } from '../../governance/ai-observability.service';
import { DomainEventsService } from '../../notifications/domain-events.service';
import { EvaluationRecorderService } from './evaluation-recorder.service';
import { ExecutionVerifierService } from './execution-verifier.service';
import { OutcomeVerifierService } from './outcome-verifier.service';
import { StateVerifierService } from './state-verifier.service';
import { RunFinalizationResult, VerificationRequest } from './verification.types';
import { VerificationRepository } from './verification.repository';

@Injectable()
export class VerificationService {
  constructor(
    private readonly verificationRepository: VerificationRepository,
    private readonly executionVerifierService: ExecutionVerifierService,
    private readonly stateVerifierService: StateVerifierService,
    private readonly outcomeVerifierService: OutcomeVerifierService,
    private readonly evaluationRecorderService: EvaluationRecorderService,
    private readonly auditService: AuditService,
    private readonly aiObservabilityService: AiObservabilityService,
    private readonly domainEventsService: DomainEventsService,
  ) {}

  async verifyActionExecution(request: VerificationRequest): Promise<RunFinalizationResult> {
    const agentRun = await this.verificationRepository.findAgentRunById(request.agentRunId);
    if (!agentRun) {
      throw new NotFoundException('Agent run not found for verification.');
    }

    const executionVerification = this.executionVerifierService.verify(request);
    const stateVerification = await this.stateVerifierService.verify(request);
    const outcomeVerification = await this.outcomeVerifierService.verify({
      organizationId: request.organizationId,
      agentRunId: request.agentRunId,
      actionType: request.actionType,
      targetEntityType: request.targetEntityType ?? null,
      targetEntityId: request.targetEntityId ?? null,
    });

    const verifications = [executionVerification, stateVerification, outcomeVerification];

    for (const verification of verifications) {
      await this.verificationRepository.createVerificationResult({
        organizationId: request.organizationId,
        agentRun: { connect: { id: request.agentRunId } },
        ...(request.actionProposalId ? { actionProposal: { connect: { id: request.actionProposalId } } } : {}),
        verificationType: verification.verificationType,
        expectedState: verification.expectedState,
        observedState: verification.observedState,
        verificationStatus: verification.verificationStatus,
        summary: verification.summary,
        details: verification.details,
      });
    }

    const finalStatus = this.resolveRunStatus(verifications);
    const verificationSummary = this.buildSummary(verifications);

    await this.verificationRepository.updateRunStatus(
      request.agentRunId,
      finalStatus,
      verificationSummary,
    );

    await this.evaluationRecorderService.record({
      organizationId: request.organizationId,
      agentRunId: request.agentRunId,
      metricName: 'verification_pass_rate',
      metricValue: verifications.filter((item) => item.verificationStatus === AgentVerificationStatus.PASSED).length / verifications.length,
      baselineValue: null,
      deltaValue: null,
      evaluationWindowStart: new Date(Date.now() - 5 * 60 * 1000),
      evaluationWindowEnd: new Date(),
      summary: verificationSummary,
    });

    const passedCount = verifications.filter(
      (item) => item.verificationStatus === AgentVerificationStatus.PASSED,
    ).length;
    const passRate = passedCount / verifications.length;

    await this.aiObservabilityService.recordVerificationOutcome({
      organizationId: request.organizationId,
      agentRunId: request.agentRunId,
      passRate,
      finalStatus,
    });

    await this.aiObservabilityService.recordDefaultImpact({
      organizationId: request.organizationId,
      agentRunId: request.agentRunId,
      actionType: request.actionType,
      passed:
        finalStatus === AgentRunStatus.VERIFIED_SUCCESS ||
        finalStatus === AgentRunStatus.VERIFIED_PARTIAL,
    });

    await this.auditService.record({
      action: 'agent.run.verify',
      entityType: 'agent-run',
      entityId: request.agentRunId,
      organizationId: request.organizationId,
      summary: verificationSummary,
      metadata: {
        finalStatus,
        verificationTypes: verifications.map((item) => item.verificationType),
      },
    });

    await this.domainEventsService.publish({
      organizationId: request.organizationId,
      eventType: 'agent.run.verified',
      aggregateType: 'agent-run',
      aggregateId: request.agentRunId,
      payload: {
        finalStatus,
        verificationSummary,
        verificationStatuses: verifications.map((item) => ({
          type: item.verificationType,
          status: item.verificationStatus,
        })),
      },
    });

    return {
      finalStatus,
      verificationSummary,
      verificationResults: verifications,
    };
  }

  private resolveRunStatus(verifications: Array<{ verificationType: AgentVerificationType; verificationStatus: AgentVerificationStatus }>) {
    if (verifications.every((item) => item.verificationStatus === AgentVerificationStatus.PASSED)) {
      return AgentRunStatus.VERIFIED_SUCCESS;
    }

    if (verifications.some((item) => item.verificationStatus === AgentVerificationStatus.FAILED)) {
      const passedCount = verifications.filter((item) => item.verificationStatus === AgentVerificationStatus.PASSED).length;
      return passedCount > 0 ? AgentRunStatus.VERIFIED_PARTIAL : AgentRunStatus.VERIFIED_FAILED;
    }

    return AgentRunStatus.VERIFIED_PARTIAL;
  }

  private buildSummary(verifications: Array<{ verificationType: AgentVerificationType; verificationStatus: AgentVerificationStatus; summary: string }>) {
    return verifications.map((item) => `${item.verificationType}: ${item.summary}`).join(' | ');
  }
}
