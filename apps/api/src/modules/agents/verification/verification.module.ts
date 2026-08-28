import { Module } from '@nestjs/common';

import { PrismaModule } from '../../../prisma/prisma.module';
import { AuditModule } from '../../audit/audit.module';
import { GovernanceModule } from '../../governance/governance.module';
import { NotificationsModule } from '../../notifications/notifications.module';
import { EvaluationRecorderService } from './evaluation-recorder.service';
import { ExecutionVerifierService } from './execution-verifier.service';
import { FeedbackCaptureService } from './feedback-capture.service';
import { OutcomeVerifierService } from './outcome-verifier.service';
import { StateVerifierService } from './state-verifier.service';
import { VerificationRepository } from './verification.repository';
import { VerificationService } from './verification.service';

@Module({
  imports: [PrismaModule, AuditModule, NotificationsModule, GovernanceModule],
  providers: [
    VerificationRepository,
    ExecutionVerifierService,
    StateVerifierService,
    OutcomeVerifierService,
    FeedbackCaptureService,
    EvaluationRecorderService,
    VerificationService,
  ],
  exports: [VerificationService, FeedbackCaptureService, EvaluationRecorderService],
})
export class VerificationModule {}
