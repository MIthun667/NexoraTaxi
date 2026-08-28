import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { Request } from 'express';

import { PlatformPermissions } from '../../common/constants/platform-permissions.constants';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import { ActionProposalReviewService } from './action-proposal-review.service';
import { ActionProposalService } from './action-proposal.service';
import { AiConnectedStoresService } from './ai-connected-stores.service';
import { AiDataTrustService } from './ai-data-trust.service';
import { AiDailyBriefService } from './ai-daily-brief.service';
import { AiExecutiveCopilotService } from './ai-executive-copilot.service';
import { AiPortfolioExecutiveService } from './ai-portfolio-executive.service';
import { AiExecutiveQaService } from './ai-executive-qa.service';
import { AiExecutionService } from './ai-execution.service';
import { AiLearningService } from './ai-learning.service';
import { AiOnboardingService } from './ai-onboarding.service';
import { AiOutcomeAnalyticsService } from './ai-outcome-analytics.service';
import { AiScenarioPlanningService } from './ai-scenario-planning.service';
import { AiStrategicPlanningService } from './ai-strategic-planning.service';
import { AiStrategicReviewService } from './ai-strategic-review.service';
import { CompleteOnboardingStepDto } from './dto/complete-onboarding-step.dto';
import { AskExecutiveQaDto } from './dto/ask-executive-qa.dto';
import { AnalyzeScenarioDto } from './dto/analyze-scenario.dto';
import { CreateStrategicPlanDto } from './dto/create-strategic-plan.dto';
import { CreateStrategicPriorityDto } from './dto/create-strategic-priority.dto';
import { ExecuteActionDto, ReviewActionDto } from './dto/execute-action.dto';
import { GenerateApprovalExplanationDto } from './dto/generate-approval-explanation.dto';
import { GenerateDispatchIncidentSummaryDto } from './dto/generate-dispatch-incident-summary.dto';
import { GenerateDriverComplianceExplanationDto } from './dto/generate-driver-compliance-explanation.dto';
import { GenerateFleetReadinessExplanationDto } from './dto/generate-fleet-readiness-explanation.dto';
import { GenerateOperationalSummaryDto } from './dto/generate-operational-summary.dto';
import { ManageConnectedStoreDto } from './dto/manage-connected-store.dto';
import { GenerateStrategicReviewDto } from './dto/generate-strategic-review.dto';
import { QueryAiOrganizationDto } from './dto/query-ai-organization.dto';
import { QueryAiRecommendationsDto } from './dto/query-ai-recommendations.dto';
import { QueryAiSignalsDto } from './dto/query-ai-signals.dto';
import { QueryActionProposalsDto } from './dto/query-action-proposals.dto';
import { QueryLearningInsightsDto } from './dto/query-learning-insights.dto';
import { QueryOutcomeAnalyticsDto } from './dto/query-outcome-analytics.dto';
import { QueryPortfolioExecutiveDto } from './dto/query-portfolio-executive.dto';
import { QueryStrategicPlanDto } from './dto/query-strategic-plan.dto';
import { QueryStrategicReviewsDto } from './dto/query-strategic-reviews.dto';
import { RecordLearningOutcomeDto } from './dto/record-learning-outcome.dto';
import { RefreshActionProposalsDto } from './dto/refresh-action-proposals.dto';
import { RefreshAiDataTrustDto } from './dto/refresh-ai-data-trust.dto';
import { RefreshAiRecommendationsDto } from './dto/refresh-ai-recommendations.dto';
import { RefreshAiSignalsDto } from './dto/refresh-ai-signals.dto';
import { ReviewActionProposalDto } from './dto/review-action-proposal.dto';
import { UpdateStrategicPlanDto } from './dto/update-strategic-plan.dto';
import { UpdateStrategicPriorityDto } from './dto/update-strategic-priority.dto';
import { IntelligenceService } from './intelligence.service';
import { AiSignalService } from './ai-signal.service';
import { AiRecommendationService } from './ai-recommendation.service';

@Controller('intelligence')
export class IntelligenceController {
  constructor(
    private readonly intelligenceService: IntelligenceService,
    private readonly aiConnectedStoresService: AiConnectedStoresService,
    private readonly aiDataTrustService: AiDataTrustService,
    private readonly aiSignalService: AiSignalService,
    private readonly aiRecommendationService: AiRecommendationService,
    private readonly aiDailyBriefService: AiDailyBriefService,
    private readonly aiExecutiveCopilotService: AiExecutiveCopilotService,
    private readonly aiPortfolioExecutiveService: AiPortfolioExecutiveService,
    private readonly aiExecutiveQaService: AiExecutiveQaService,
    private readonly aiOnboardingService: AiOnboardingService,
    private readonly aiOutcomeAnalyticsService: AiOutcomeAnalyticsService,
    private readonly aiScenarioPlanningService: AiScenarioPlanningService,
    private readonly aiStrategicPlanningService: AiStrategicPlanningService,
    private readonly aiStrategicReviewService: AiStrategicReviewService,
    private readonly aiExecutionService: AiExecutionService,
    private readonly aiLearningService: AiLearningService,
    private readonly actionProposalService: ActionProposalService,
    private readonly actionProposalReviewService: ActionProposalReviewService,
  ) {}

  @Get('health')
  @Permissions(PlatformPermissions.intelligenceRead)
  getHealth() {
    return this.intelligenceService.checkHealth();
  }

  @Get('onboarding-status')
  @Permissions(PlatformPermissions.intelligenceRead)
  getOnboardingStatus(@Req() request: Request, @Query() query: QueryAiOrganizationDto) {
    return this.aiOnboardingService.getOnboardingStatus(
      request.principal as CurrentPrincipal,
      query,
    );
  }

  @Post('onboarding/refresh')
  @Permissions(PlatformPermissions.intelligenceRead)
  refreshOnboardingStatus(@Req() request: Request, @Query() query: QueryAiOrganizationDto) {
    return this.aiOnboardingService.refreshOnboardingStatus(
      request.principal as CurrentPrincipal,
      query,
    );
  }

  @Post('onboarding/complete-step')
  @Permissions(PlatformPermissions.intelligenceGenerate)
  completeOnboardingStep(@Req() request: Request, @Body() dto: CompleteOnboardingStepDto) {
    return this.aiOnboardingService.completeOnboardingStep(
      request.principal as CurrentPrincipal,
      dto.step,
      dto.organizationId,
    );
  }

  @Get('actions')
  @Permissions(PlatformPermissions.intelligenceRead)
  listActions(@Req() request: Request, @Query() query: any) {
    return this.aiExecutionService.listExecutions(
      request.principal as CurrentPrincipal,
      query,
    );
  }

  @Get('actions/:id')
  @Permissions(PlatformPermissions.intelligenceRead)
  getActionById(@Req() request: Request, @Param('id') id: string) {
    return this.aiExecutionService.getExecution(
      request.principal as CurrentPrincipal,
      id,
    );
  }

  @Post('actions/execute')
  @Permissions(PlatformPermissions.intelligenceGenerate)
  executeAction(@Req() request: Request, @Body() dto: ExecuteActionDto) {
    return this.aiExecutionService.createExecutionFromProposal(
      request.principal as CurrentPrincipal,
      dto.proposalId,
    );
  }

  @Post('actions/:id/approve')
  @Permissions(PlatformPermissions.intelligenceReview)
  approveAction(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() dto: ReviewActionDto,
  ) {
    return this.aiExecutionService.approveAction(
      request.principal as CurrentPrincipal,
      id,
      dto.note,
    );
  }

  @Post('actions/:id/reject')
  @Permissions(PlatformPermissions.intelligenceReview)
  rejectAction(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() dto: ReviewActionDto,
  ) {
    return this.aiExecutionService.rejectAction(
      request.principal as CurrentPrincipal,
      id,
      dto.note,
    );
  }

  @Get('learning/insights')
  @Permissions(PlatformPermissions.intelligenceRead)
  getLearningInsights(@Req() request: Request, @Query() query: QueryLearningInsightsDto) {
    return this.aiLearningService.getLearningInsights(
      request.principal as CurrentPrincipal,
      query,
    );
  }

  @Post('learning/outcome')
  @Permissions(PlatformPermissions.intelligenceGenerate)
  recordOutcome(@Req() request: Request, @Body() dto: RecordLearningOutcomeDto) {
    return this.aiLearningService.recordOutcome(
      request.principal as CurrentPrincipal,
      dto.executionId,
      dto,
    );
  }

  @Get('outcome-analytics')
  @Permissions(PlatformPermissions.intelligenceRead)
  getOutcomeAnalytics(@Req() request: Request, @Query() query: QueryOutcomeAnalyticsDto) {
    return this.aiOutcomeAnalyticsService.getOutcomeAnalytics(
      request.principal as CurrentPrincipal,
      query,
    );
  }

  @Post('outcome-analytics/refresh')
  @Permissions(PlatformPermissions.intelligenceGenerate)
  refreshOutcomeAnalytics(@Req() request: Request, @Body() dto: QueryOutcomeAnalyticsDto) {
    return this.aiOutcomeAnalyticsService.refreshOutcomeAnalytics(
      request.principal as CurrentPrincipal,
      dto,
    );
  }

  @Get('overview')
  @Permissions(PlatformPermissions.intelligenceRead)
  getOverview(@Req() request: Request, @Query() query: QueryAiOrganizationDto) {
    return this.intelligenceService.getOverview(
      request.principal as CurrentPrincipal,
      query,
    );
  }

  @Get('daily-brief')
  @Permissions(PlatformPermissions.intelligenceRead)
  getDailyBrief(@Req() request: Request, @Query() query: QueryAiOrganizationDto) {
    return this.aiDailyBriefService.getDailyBrief(
      request.principal as CurrentPrincipal,
      query,
    );
  }

  @Get('executive-copilot')
  @Permissions(PlatformPermissions.intelligenceRead)
  getExecutiveCopilot(@Req() request: Request, @Query() query: QueryAiOrganizationDto) {
    return this.aiExecutiveCopilotService.getExecutiveCopilot(
      request.principal as CurrentPrincipal,
      query,
    );
  }

  @Post('executive-copilot/refresh')
  @Permissions(PlatformPermissions.intelligenceGenerate)
  refreshExecutiveCopilot(@Req() request: Request, @Body() dto: QueryAiOrganizationDto) {
    return this.aiExecutiveCopilotService.refreshExecutiveCopilot(
      request.principal as CurrentPrincipal,
      dto,
    );
  }

  @Get('portfolio-executive')
  @Permissions(PlatformPermissions.intelligenceRead)
  getPortfolioExecutive(@Req() request: Request, @Query() query: QueryPortfolioExecutiveDto) {
    return this.aiPortfolioExecutiveService.getPortfolioExecutive(
      request.principal as CurrentPrincipal,
      query,
    );
  }

  @Post('portfolio-executive/refresh')
  @Permissions(PlatformPermissions.intelligenceGenerate)
  refreshPortfolioExecutive(@Req() request: Request, @Body() dto: QueryPortfolioExecutiveDto) {
    return this.aiPortfolioExecutiveService.refreshPortfolioExecutive(
      request.principal as CurrentPrincipal,
      dto,
    );
  }

  @Post('executive-qa/ask')
  @Permissions(PlatformPermissions.intelligenceRead)
  askExecutiveQuestion(@Req() request: Request, @Body() dto: AskExecutiveQaDto) {
    return this.aiExecutiveQaService.ask(request.principal as CurrentPrincipal, dto);
  }

  @Get('executive-qa/suggestions')
  @Permissions(PlatformPermissions.intelligenceRead)
  getExecutiveQaSuggestions() {
    return this.aiExecutiveQaService.getSuggestions();
  }

  @Post('scenario-planning/analyze')
  @Permissions(PlatformPermissions.intelligenceRead)
  analyzeScenario(@Req() request: Request, @Body() dto: AnalyzeScenarioDto) {
    return this.aiScenarioPlanningService.analyze(
      request.principal as CurrentPrincipal,
      dto,
    );
  }

  @Get('scenario-planning/options')
  @Permissions(PlatformPermissions.intelligenceRead)
  getScenarioPlanningOptions() {
    return this.aiScenarioPlanningService.getOptions();
  }

  @Get('strategic-plan')
  @Permissions(PlatformPermissions.intelligenceRead)
  getStrategicPlan(@Req() request: Request, @Query() query: QueryStrategicPlanDto) {
    return this.aiStrategicPlanningService.getStrategicPlan(
      request.principal as CurrentPrincipal,
      query,
    );
  }

  @Post('strategic-plan')
  @Permissions(PlatformPermissions.intelligenceGenerate)
  createStrategicPlan(@Req() request: Request, @Body() dto: CreateStrategicPlanDto) {
    return this.aiStrategicPlanningService.createStrategicPlan(
      request.principal as CurrentPrincipal,
      dto,
    );
  }

  @Patch('strategic-plan/:id')
  @Permissions(PlatformPermissions.intelligenceGenerate)
  updateStrategicPlan(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() dto: UpdateStrategicPlanDto,
  ) {
    return this.aiStrategicPlanningService.updateStrategicPlan(
      request.principal as CurrentPrincipal,
      id,
      dto,
    );
  }

  @Post('strategic-plan/:id/generate-candidates')
  @Permissions(PlatformPermissions.intelligenceGenerate)
  generateStrategicCandidates(@Req() request: Request, @Param('id') id: string) {
    return this.aiStrategicPlanningService.generateCandidates(
      request.principal as CurrentPrincipal,
      id,
    );
  }

  @Post('strategic-plan/:id/priorities')
  @Permissions(PlatformPermissions.intelligenceGenerate)
  createStrategicPriority(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() dto: CreateStrategicPriorityDto,
  ) {
    return this.aiStrategicPlanningService.createPriority(
      request.principal as CurrentPrincipal,
      id,
      dto,
    );
  }

  @Patch('strategic-plan/:id/priorities/:priorityId')
  @Permissions(PlatformPermissions.intelligenceGenerate)
  updateStrategicPriority(
    @Req() request: Request,
    @Param('id') id: string,
    @Param('priorityId') priorityId: string,
    @Body() dto: UpdateStrategicPriorityDto,
  ) {
    return this.aiStrategicPlanningService.updatePriority(
      request.principal as CurrentPrincipal,
      id,
      priorityId,
      dto,
    );
  }

  @Get('strategic-reviews')
  @Permissions(PlatformPermissions.intelligenceRead)
  listStrategicReviews(@Req() request: Request, @Query() query: QueryStrategicReviewsDto) {
    return this.aiStrategicReviewService.listStrategicReviews(
      request.principal as CurrentPrincipal,
      query,
    );
  }

  @Get('strategic-reviews/:id')
  @Permissions(PlatformPermissions.intelligenceRead)
  getStrategicReview(@Req() request: Request, @Param('id') id: string) {
    return this.aiStrategicReviewService.getStrategicReview(
      request.principal as CurrentPrincipal,
      id,
    );
  }

  @Post('strategic-reviews/generate')
  @Permissions(PlatformPermissions.intelligenceGenerate)
  generateStrategicReview(@Req() request: Request, @Body() dto: GenerateStrategicReviewDto) {
    return this.aiStrategicReviewService.generateStrategicReview(
      request.principal as CurrentPrincipal,
      dto,
    );
  }

  @Get('data-trust')
  @Permissions(PlatformPermissions.intelligenceRead)
  getDataTrust(@Req() request: Request, @Query() query: QueryAiOrganizationDto) {
    return this.aiDataTrustService.getDataTrust(
      request.principal as CurrentPrincipal,
      query,
    );
  }

  @Post('data-trust/refresh')
  @Permissions(PlatformPermissions.intelligenceGenerate)
  refreshDataTrust(@Req() request: Request, @Body() dto: RefreshAiDataTrustDto) {
    return this.aiDataTrustService.refreshDataTrust(
      request.principal as CurrentPrincipal,
      dto,
    );
  }

  @Get('connected-stores')
  @Permissions(PlatformPermissions.intelligenceRead)
  getConnectedStores(@Req() request: Request, @Query() query: QueryAiOrganizationDto) {
    return this.aiConnectedStoresService.listConnectedStores(
      request.principal as CurrentPrincipal,
      query,
    );
  }

  @Get('connected-stores/:id')
  @Permissions(PlatformPermissions.intelligenceRead)
  getConnectedStoreById(
    @Req() request: Request,
    @Param('id') id: string,
    @Query() query: QueryAiOrganizationDto,
  ) {
    return this.aiConnectedStoresService.getConnectedStoreById(
      request.principal as CurrentPrincipal,
      id,
      query,
    );
  }

  @Post('connected-stores/:id/refresh')
  @Permissions(PlatformPermissions.intelligenceGenerate)
  refreshConnectedStore(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() dto: ManageConnectedStoreDto,
  ) {
    return this.aiConnectedStoresService.refreshConnectedStore(
      request.principal as CurrentPrincipal,
      id,
      dto,
    );
  }

  @Post('connected-stores/:id/retry-shopify-sync')
  @Permissions(PlatformPermissions.organizationManage)
  retryConnectedStoreShopifySync(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() dto: ManageConnectedStoreDto,
  ) {
    return this.aiConnectedStoresService.retryShopifySync(
      request.principal as CurrentPrincipal,
      id,
      dto,
    );
  }

  @Post('connected-stores/:id/retry-stripe-sync')
  @Permissions(PlatformPermissions.organizationManage)
  retryConnectedStoreStripeSync(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() dto: ManageConnectedStoreDto,
  ) {
    return this.aiConnectedStoresService.retryStripeSync(
      request.principal as CurrentPrincipal,
      id,
      dto,
    );
  }

  @Get('recommendations')
  @Permissions(PlatformPermissions.intelligenceRead)
  getRecommendations(@Req() request: Request, @Query() query: QueryAiRecommendationsDto) {
    return this.aiRecommendationService.listRecommendations(
      request.principal as CurrentPrincipal,
      query,
    );
  }

  @Get('recommendations/:id')
  @Permissions(PlatformPermissions.intelligenceRead)
  getRecommendationById(
    @Req() request: Request,
    @Param('id') id: string,
    @Query() query: QueryAiRecommendationsDto,
  ) {
    return this.aiRecommendationService.getRecommendationById(
      request.principal as CurrentPrincipal,
      id,
      query,
    );
  }

  @Post('recommendations/refresh')
  @Permissions(PlatformPermissions.intelligenceGenerate)
  refreshRecommendations(@Req() request: Request, @Body() dto: RefreshAiRecommendationsDto) {
    return this.aiRecommendationService.refreshRecommendations(
      request.principal as CurrentPrincipal,
      dto,
    );
  }

  @Get('signals')
  @Permissions(PlatformPermissions.intelligenceRead)
  getSignals(@Req() request: Request, @Query() query: QueryAiSignalsDto) {
    return this.aiSignalService.listSignals(
      request.principal as CurrentPrincipal,
      query,
    );
  }

  @Get('signals/:id')
  @Permissions(PlatformPermissions.intelligenceRead)
  getSignalById(
    @Req() request: Request,
    @Param('id') id: string,
    @Query() query: QueryAiSignalsDto,
  ) {
    return this.aiSignalService.getSignalById(
      request.principal as CurrentPrincipal,
      id,
      query,
    );
  }

  @Post('signals/refresh')
  @Permissions(PlatformPermissions.intelligenceGenerate)
  refreshSignals(@Req() request: Request, @Body() dto: RefreshAiSignalsDto) {
    return this.aiSignalService.refreshSignals(
      request.principal as CurrentPrincipal,
      dto,
    );
  }

  @Get('action-proposals')
  @Permissions(PlatformPermissions.intelligenceRead)
  getActionProposals(@Req() request: Request, @Query() query: QueryActionProposalsDto) {
    return this.actionProposalService.listActionProposals(
      request.principal as CurrentPrincipal,
      query,
    );
  }

  @Post('action-proposals/refresh')
  @Permissions(PlatformPermissions.intelligenceGenerate)
  refreshActionProposals(@Req() request: Request, @Body() dto: RefreshActionProposalsDto) {
    return this.actionProposalService.refreshActionProposals(
      request.principal as CurrentPrincipal,
      dto,
    );
  }

  @Post('action-proposals/approve')
  @Permissions(PlatformPermissions.intelligenceReview)
  approveActionProposal(@Req() request: Request, @Body() dto: ReviewActionProposalDto) {
    return this.actionProposalReviewService.approveProposal(
      request.principal as CurrentPrincipal,
      dto,
    );
  }

  @Post('action-proposals/reject')
  @Permissions(PlatformPermissions.intelligenceReview)
  rejectActionProposal(@Req() request: Request, @Body() dto: ReviewActionProposalDto) {
    return this.actionProposalReviewService.rejectProposal(
      request.principal as CurrentPrincipal,
      dto,
    );
  }

  @Post('action-proposals/defer')
  @Permissions(PlatformPermissions.intelligenceReview)
  deferActionProposal(@Req() request: Request, @Body() dto: ReviewActionProposalDto) {
    return this.actionProposalReviewService.deferProposal(
      request.principal as CurrentPrincipal,
      dto,
    );
  }

  @Post('operational-summary')
  @Permissions(PlatformPermissions.intelligenceGenerate)
  generateOperationalSummary(
    @Req() request: Request,
    @Body() dto: GenerateOperationalSummaryDto,
  ) {
    return this.intelligenceService.generateOperationalSummary(
      request.principal as CurrentPrincipal,
      dto,
    );
  }

  @Post('approval-explanation')
  @Permissions(PlatformPermissions.intelligenceGenerate)
  generateApprovalExplanation(
    @Req() request: Request,
    @Body() dto: GenerateApprovalExplanationDto,
  ) {
    return this.intelligenceService.generateApprovalExplanation(
      request.principal as CurrentPrincipal,
      dto,
    );
  }

  @Post('dispatch-incident-summary')
  @Permissions(PlatformPermissions.intelligenceGenerate)
  generateDispatchIncidentSummary(
    @Req() request: Request,
    @Body() dto: GenerateDispatchIncidentSummaryDto,
  ) {
    return this.intelligenceService.generateDispatchIncidentSummary(
      request.principal as CurrentPrincipal,
      dto,
    );
  }

  @Post('driver-compliance-explanation')
  @Permissions(PlatformPermissions.intelligenceGenerate)
  generateDriverComplianceExplanation(
    @Req() request: Request,
    @Body() dto: GenerateDriverComplianceExplanationDto,
  ) {
    return this.intelligenceService.generateDriverComplianceExplanation(
      request.principal as CurrentPrincipal,
      dto,
    );
  }

  @Post('fleet-readiness-explanation')
  @Permissions(PlatformPermissions.intelligenceGenerate)
  generateFleetReadinessExplanation(
    @Req() request: Request,
    @Body() dto: GenerateFleetReadinessExplanationDto,
  ) {
    return this.intelligenceService.generateFleetReadinessExplanation(
      request.principal as CurrentPrincipal,
      dto,
    );
  }
}
