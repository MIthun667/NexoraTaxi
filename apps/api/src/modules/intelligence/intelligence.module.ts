import { forwardRef, Module } from '@nestjs/common';

import { AssetsModule } from '../assets/assets.module';
import { AgentsModule } from '../agents/agents.module';
import { ApprovalsModule } from '../approvals/approvals.module';
import { SchedulingModule } from '../scheduling/scheduling.module';
import { CrmModule } from '../crm/crm.module';
import { ShopifyModule } from '../integrations/shopify/shopify.module';
import { StripeModule } from '../integrations/stripe/stripe.module';
import { WorkforceModule } from '../workforce/workforce.module';
import { WorkflowsModule } from '../workflows/workflows.module';
import { ActionProposalService } from './action-proposal.service';
import { ActionProposalReviewService } from './action-proposal-review.service';
import { AiActionProposalEngineService } from './ai-action-proposal-engine.service';
import { AiCommerceMetricsService } from './ai-commerce-metrics.service';
import { AiConnectedStoresService } from './ai-connected-stores.service';
import { AiController } from './ai.controller';
import { AiDataTrustService } from './ai-data-trust.service';
import { AiDailyBriefService } from './ai-daily-brief.service';
import { AiExecutiveCopilotService } from './ai-executive-copilot.service';
import { AiPortfolioExecutiveService } from './ai-portfolio-executive.service';
import { AiExecutiveQaService } from './ai-executive-qa.service';
import { AiExecutionService } from './ai-execution.service';
import { AiOnboardingService } from './ai-onboarding.service';
import { AiExecutiveSummaryService } from './ai-executive-summary.service';
import { AiInsightService } from './ai-insight.service';
import { AiLearningService } from './ai-learning.service';
import { AiLlmSummaryService } from './ai-llm-summary.service';
import { AiNotificationService } from './ai-notification.service';
import { AiOverviewService } from './ai-overview.service';
import { AiOutcomeAnalyticsService } from './ai-outcome-analytics.service';
import { AiScenarioPlanningService } from './ai-scenario-planning.service';
import { AiStrategicPlanningService } from './ai-strategic-planning.service';
import { AiStrategicReviewService } from './ai-strategic-review.service';
import { AiRecommendationService } from './ai-recommendation.service';
import { AiSignalService } from './ai-signal.service';
import { AiSummaryService } from './ai-summary.service';
import { AiWeeklyDigestService } from './ai-weekly-digest.service';
import { AiWeeklyReportMetricsService } from './ai-weekly-report-metrics.service';
import { IntelligenceController } from './intelligence.controller';
import { IntelligenceService } from './intelligence.service';
import { InferenceAuditService } from './inference-audit.service';
import { OllamaClientService } from './ollama-client.service';
import { PromptTemplateService } from './prompt-template.service';
import { BudgetVarianceAnomalyDetector } from './anomalies/budget-variance-anomaly.detector';
import { NoopAnomalyDetector } from './anomalies/noop-anomaly.detector';
import { StalledWorkflowAnomalyDetector } from './anomalies/stalled-workflow-anomaly.detector';
import { WorkforceAttendanceAnomalyDetector } from './anomalies/workforce-attendance-anomaly.detector';
import { SignalRegistryService } from './signal-registry.service';
import { OperationsSignalProducer } from './signals/operations-signal.producer';
import { WorkforceSignalProducer } from './signals/workforce-signal.producer';
import { StructuredInferenceService } from './structured-inference.service';
import { WorkflowAuditService } from './workflow-audit.service';
import { ExecutiveSummaryService } from './executive-summary.service';
import { InsightEngine } from './insight-engine';
import { RecommendationEngine } from './recommendation-engine';
import { SignalEngine } from './signal-engine';

@Module({
  imports: [
    AssetsModule,
    WorkforceModule,
    CrmModule,
    SchedulingModule,
    ApprovalsModule,
    WorkflowsModule,
    forwardRef(() => AgentsModule),
    forwardRef(() => ShopifyModule),
    forwardRef(() => StripeModule),
  ],
  controllers: [IntelligenceController, AiController],
  providers: [
    AiCommerceMetricsService,
    AiActionProposalEngineService,
    AiConnectedStoresService,
    AiDataTrustService,
    AiDailyBriefService,
    AiExecutiveCopilotService,
    AiPortfolioExecutiveService,
    AiExecutiveQaService,
    AiOnboardingService,
    AiOutcomeAnalyticsService,
    AiScenarioPlanningService,
    AiStrategicPlanningService,
    AiStrategicReviewService,
    AiExecutionService,
    AiLearningService,
    AiOverviewService,
    SignalEngine,
    InsightEngine,
    RecommendationEngine,
    ExecutiveSummaryService,
    AiWeeklyReportMetricsService,
    AiSignalService,
    AiInsightService,
    AiSummaryService,
    AiLlmSummaryService,
    AiExecutiveSummaryService,
    AiWeeklyDigestService,
    AiNotificationService,
    AiRecommendationService,
    ActionProposalService,
    ActionProposalReviewService,
    WorkflowAuditService,
    IntelligenceService,
    InferenceAuditService,
    OllamaClientService,
    PromptTemplateService,
    StructuredInferenceService,
    SignalRegistryService,
    WorkforceSignalProducer,
    OperationsSignalProducer,
    NoopAnomalyDetector,
    WorkforceAttendanceAnomalyDetector,
    BudgetVarianceAnomalyDetector,
    StalledWorkflowAnomalyDetector,
  ],
  exports: [
    AiCommerceMetricsService,
    AiActionProposalEngineService,
    AiConnectedStoresService,
    AiDataTrustService,
    AiDailyBriefService,
    AiExecutiveCopilotService,
    AiPortfolioExecutiveService,
    AiExecutiveQaService,
    AiOnboardingService,
    AiOutcomeAnalyticsService,
    AiScenarioPlanningService,
    AiStrategicPlanningService,
    AiStrategicReviewService,
    AiExecutionService,
    AiLearningService,
    AiOverviewService,
    SignalEngine,
    InsightEngine,
    RecommendationEngine,
    ExecutiveSummaryService,
    AiWeeklyReportMetricsService,
    AiSignalService,
    AiInsightService,
    AiSummaryService,
    AiLlmSummaryService,
    AiExecutiveSummaryService,
    AiWeeklyDigestService,
    AiNotificationService,
    AiRecommendationService,
    ActionProposalService,
    ActionProposalReviewService,
    IntelligenceService,
    InferenceAuditService,
    OllamaClientService,
    StructuredInferenceService,
    PromptTemplateService,
    SignalRegistryService,
  ],
})
export class IntelligenceModule {}
