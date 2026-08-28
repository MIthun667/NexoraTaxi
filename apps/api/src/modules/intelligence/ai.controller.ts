import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { Request } from 'express';

import { PlatformPermissions } from '../../common/constants/platform-permissions.constants';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import { ActionProposalService } from './action-proposal.service';
import { ActionProposalReviewService } from './action-proposal-review.service';
import { AiConnectedStoresService } from './ai-connected-stores.service';
import { AiDataTrustService } from './ai-data-trust.service';
import { AiDailyBriefService } from './ai-daily-brief.service';
import { AiExecutiveCopilotService } from './ai-executive-copilot.service';
import { AiPortfolioExecutiveService } from './ai-portfolio-executive.service';
import { AiExecutiveQaService } from './ai-executive-qa.service';
import { AiLearningService } from './ai-learning.service';
import { AiOnboardingService } from './ai-onboarding.service';
import { AiExecutiveSummaryService } from './ai-executive-summary.service';
import { AiInsightService } from './ai-insight.service';
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
import { CreateActionProposalDto } from './dto/create-action-proposal.dto';
import { AskExecutiveQaDto } from './dto/ask-executive-qa.dto';
import { AnalyzeScenarioDto } from './dto/analyze-scenario.dto';
import { CreateStrategicPlanDto } from './dto/create-strategic-plan.dto';
import { CreateStrategicPriorityDto } from './dto/create-strategic-priority.dto';
import { GenerateAiExecutiveSummaryDto } from './dto/generate-ai-executive-summary.dto';
import { GenerateAiRecommendationsDto } from './dto/generate-ai-recommendations.dto';
import { GenerateStrategicReviewDto } from './dto/generate-strategic-review.dto';
import { GenerateAiWeeklyDigestDto } from './dto/generate-ai-weekly-digest.dto';
import { MarkAiNotificationDto } from './dto/mark-ai-notification.dto';
import { MarkAllAiNotificationsDto } from './dto/mark-all-ai-notifications.dto';
import { ManageConnectedStoreDto } from './dto/manage-connected-store.dto';
import { QueryAiOrganizationDto } from './dto/query-ai-organization.dto';
import { QueryAiNotificationsDto } from './dto/query-ai-notifications.dto';
import { QueryAiRecommendationsDto } from './dto/query-ai-recommendations.dto';
import { QueryAiSignalsDto } from './dto/query-ai-signals.dto';
import { QueryActionProposalsDto } from './dto/query-action-proposals.dto';
import { QueryLearningInsightsDto } from './dto/query-learning-insights.dto';
import { QueryOutcomeAnalyticsDto } from './dto/query-outcome-analytics.dto';
import { QueryPortfolioExecutiveDto } from './dto/query-portfolio-executive.dto';
import { QueryStrategicPlanDto } from './dto/query-strategic-plan.dto';
import { QueryStrategicReviewsDto } from './dto/query-strategic-reviews.dto';
import { QueryWeeklyDigestHistoryDto } from './dto/query-weekly-digest-history.dto';
import { RecordLearningOutcomeDto } from './dto/record-learning-outcome.dto';
import { RefreshActionProposalsDto } from './dto/refresh-action-proposals.dto';
import { RefreshAiDataTrustDto } from './dto/refresh-ai-data-trust.dto';
import { RefreshAiRecommendationsDto } from './dto/refresh-ai-recommendations.dto';
import { RefreshAiSignalsDto } from './dto/refresh-ai-signals.dto';
import { ReviewActionProposalDto } from './dto/review-action-proposal.dto';
import { UpdateStrategicPlanDto } from './dto/update-strategic-plan.dto';
import { UpdateStrategicPriorityDto } from './dto/update-strategic-priority.dto';

@Controller('ai')
export class AiController {
  constructor(
    private readonly aiSignalService: AiSignalService,
    private readonly aiConnectedStoresService: AiConnectedStoresService,
    private readonly aiDataTrustService: AiDataTrustService,
    private readonly aiInsightService: AiInsightService,
    private readonly aiSummaryService: AiSummaryService,
    private readonly aiDailyBriefService: AiDailyBriefService,
    private readonly aiExecutiveCopilotService: AiExecutiveCopilotService,
    private readonly aiPortfolioExecutiveService: AiPortfolioExecutiveService,
    private readonly aiExecutiveQaService: AiExecutiveQaService,
    private readonly aiLearningService: AiLearningService,
    private readonly aiOutcomeAnalyticsService: AiOutcomeAnalyticsService,
    private readonly aiScenarioPlanningService: AiScenarioPlanningService,
    private readonly aiStrategicPlanningService: AiStrategicPlanningService,
    private readonly aiStrategicReviewService: AiStrategicReviewService,
    private readonly aiOnboardingService: AiOnboardingService,
    private readonly aiOverviewService: AiOverviewService,
    private readonly aiExecutiveSummaryService: AiExecutiveSummaryService,
    private readonly aiWeeklyDigestService: AiWeeklyDigestService,
    private readonly aiNotificationService: AiNotificationService,
    private readonly aiRecommendationService: AiRecommendationService,
    private readonly actionProposalService: ActionProposalService,
    private readonly actionProposalReviewService: ActionProposalReviewService,
  ) {}

  @Get('overview')
  @Permissions(PlatformPermissions.intelligenceRead)
  getOverview(@Req() request: Request, @Query() query: QueryAiOrganizationDto) {
    return this.aiOverviewService.getOverview(
      request.principal as CurrentPrincipal,
      query,
    );
  }

  @Get('signals')
  @Permissions(PlatformPermissions.intelligenceRead)
  getSignals(@Req() request: Request, @Query() query: QueryAiSignalsDto) {
    return this.aiSignalService.listSignals(request.principal as CurrentPrincipal, query);
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

  @Get('insights')
  @Permissions(PlatformPermissions.intelligenceRead)
  getInsights(@Req() request: Request, @Query() query: QueryAiOrganizationDto) {
    return this.aiInsightService.listInsights(request.principal as CurrentPrincipal, query);
  }

  @Get('summary/today')
  @Permissions(PlatformPermissions.intelligenceRead)
  getTodaySummary(@Req() request: Request, @Query() query: QueryAiOrganizationDto) {
    return this.aiSummaryService.getTodaySummary(
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

  @Get('onboarding-status')
  @Permissions(PlatformPermissions.intelligenceRead)
  getOnboardingStatus(@Req() request: Request, @Query() query: QueryAiOrganizationDto) {
    return this.aiOnboardingService.getOnboardingStatus(
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

  @Get('executive-summary/today')
  @Permissions(PlatformPermissions.intelligenceRead)
  getTodayExecutiveSummary(@Req() request: Request, @Query() query: QueryAiOrganizationDto) {
    return this.aiExecutiveSummaryService.getTodayExecutiveSummary(
      request.principal as CurrentPrincipal,
      query,
    );
  }

  @Get('reports/weekly/current')
  @Permissions(PlatformPermissions.intelligenceRead)
  getCurrentWeeklyDigest(@Req() request: Request, @Query() query: QueryAiOrganizationDto) {
    return this.aiWeeklyDigestService.getCurrentWeeklyDigest(
      request.principal as CurrentPrincipal,
      query,
    );
  }

  @Get('reports/weekly/history')
  @Permissions(PlatformPermissions.intelligenceRead)
  getWeeklyDigestHistory(
    @Req() request: Request,
    @Query() query: QueryWeeklyDigestHistoryDto,
  ) {
    return this.aiWeeklyDigestService.getWeeklyDigestHistory(
      request.principal as CurrentPrincipal,
      query,
    );
  }

  @Post('reports/weekly/generate')
  @Permissions(PlatformPermissions.intelligenceGenerate)
  generateWeeklyDigest(
    @Req() request: Request,
    @Body() dto: GenerateAiWeeklyDigestDto,
  ) {
    return this.aiWeeklyDigestService.generateWeeklyDigest(
      request.principal as CurrentPrincipal,
      dto,
    );
  }

  @Post('executive-summary/generate')
  @Permissions(PlatformPermissions.intelligenceGenerate)
  generateExecutiveSummary(
    @Req() request: Request,
    @Body() dto: GenerateAiExecutiveSummaryDto,
  ) {
    return this.aiExecutiveSummaryService.generateExecutiveSummary(
      request.principal as CurrentPrincipal,
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

  @Post('recommendations/generate')
  @Permissions(PlatformPermissions.intelligenceGenerate)
  generateRecommendations(
    @Req() request: Request,
    @Body() dto: GenerateAiRecommendationsDto,
  ) {
    return this.aiRecommendationService.generateRecommendations(
      request.principal as CurrentPrincipal,
      dto,
    );
  }

  @Post('recommendations/refresh')
  @Permissions(PlatformPermissions.intelligenceGenerate)
  refreshRecommendations(
    @Req() request: Request,
    @Body() dto: RefreshAiRecommendationsDto,
  ) {
    return this.aiRecommendationService.refreshRecommendations(
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
  refreshActionProposals(
    @Req() request: Request,
    @Body() dto: RefreshActionProposalsDto,
  ) {
    return this.actionProposalService.refreshActionProposals(
      request.principal as CurrentPrincipal,
      dto,
    );
  }

  @Get('action-proposals/pending')
  @Permissions(PlatformPermissions.intelligenceRead)
  getPendingActionProposals(@Req() request: Request, @Query() query: QueryActionProposalsDto) {
    return this.actionProposalReviewService.listPendingProposals(
      request.principal as CurrentPrincipal,
      query,
    );
  }

  @Get('action-proposals/history')
  @Permissions(PlatformPermissions.intelligenceRead)
  getActionProposalHistory(@Req() request: Request, @Query() query: QueryActionProposalsDto) {
    return this.actionProposalReviewService.listProposalHistory(
      request.principal as CurrentPrincipal,
      query,
    );
  }

  @Post('action-proposals')
  @Permissions(PlatformPermissions.intelligenceGenerate)
  createActionProposal(
    @Req() request: Request,
    @Body() dto: CreateActionProposalDto,
  ) {
    return this.actionProposalService.createFromRecommendation(
      request.principal as CurrentPrincipal,
      dto,
    );
  }

  @Post('action-proposals/review')
  @Permissions(PlatformPermissions.intelligenceGenerate)
  submitActionProposalForReview(
    @Req() request: Request,
    @Body() dto: ReviewActionProposalDto,
  ) {
    return this.actionProposalReviewService.submitProposalForReview(
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

  @Post('action-proposals/request-revision')
  @Permissions(PlatformPermissions.intelligenceReview)
  requestActionProposalRevision(
    @Req() request: Request,
    @Body() dto: ReviewActionProposalDto,
  ) {
    return this.actionProposalReviewService.requestProposalRevision(
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

  @Get('notifications')
  @Permissions(PlatformPermissions.intelligenceRead)
  getNotifications(@Req() request: Request, @Query() query: QueryAiNotificationsDto) {
    return this.aiNotificationService.listNotifications(
      request.principal as CurrentPrincipal,
      query,
    );
  }

  @Post('notifications/mark-read')
  @Permissions(PlatformPermissions.intelligenceGenerate)
  markNotificationRead(@Req() request: Request, @Body() dto: MarkAiNotificationDto) {
    return this.aiNotificationService.markAsRead(
      request.principal as CurrentPrincipal,
      dto,
    );
  }

  @Post('notifications/mark-all-read')
  @Permissions(PlatformPermissions.intelligenceGenerate)
  markAllNotificationsRead(
    @Req() request: Request,
    @Body() dto: MarkAllAiNotificationsDto,
  ) {
    return this.aiNotificationService.markAllAsRead(
      request.principal as CurrentPrincipal,
      dto,
    );
  }

  @Post('notifications/archive')
  @Permissions(PlatformPermissions.intelligenceGenerate)
  archiveNotification(@Req() request: Request, @Body() dto: MarkAiNotificationDto) {
    return this.aiNotificationService.archiveNotification(
      request.principal as CurrentPrincipal,
      dto,
    );
  }
}
