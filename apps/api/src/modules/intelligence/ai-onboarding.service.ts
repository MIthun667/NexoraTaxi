import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { AiOnboardingStep } from '@prisma/client';

import { CurrentPrincipal } from '../../common/interfaces/current-principal.interface';
import { PlatformLoggerService } from '../../common/services/platform-logger.service';
import { PrismaService } from '../../prisma/prisma.service';
import { buildSuccessResponse } from '../../shared/responses/response.util';
import { CommerceAgentOrchestrationService } from '../agents/commerce-agent-orchestration.service';
import { AiCommerceMetricsService } from './ai-commerce-metrics.service';
import { AiDataTrustService } from './ai-data-trust.service';
import { QueryAiOrganizationDto } from './dto/query-ai-organization.dto';

@Injectable()
export class AiOnboardingService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly aiDataTrustService: AiDataTrustService,
    private readonly aiCommerceMetricsService: AiCommerceMetricsService,
    @Inject(forwardRef(() => CommerceAgentOrchestrationService))
    private readonly commerceAgentOrchestrationService: CommerceAgentOrchestrationService,
    private readonly logger: PlatformLoggerService,
  ) {}

  async getOnboardingStatus(principal: CurrentPrincipal, query: QueryAiOrganizationDto) {
    const organizationId = await this.aiCommerceMetricsService.resolveOrganizationScope(
      principal,
      query.organizationId,
    );

    let status = await this.prismaService.aiOnboardingStatus.findUnique({
      where: { organizationId },
    });

    if (!status) {
      status = await this.prismaService.aiOnboardingStatus.create({
        data: {
          organizationId,
          currentStep: AiOnboardingStep.CONNECT_STORE,
          stepsCompleted: [],
        },
      });
    }

    // Automatically refresh status to detect completions
    return this.refreshOnboardingStatus(principal, query);
  }

  async refreshOnboardingStatus(principal: CurrentPrincipal, query: QueryAiOrganizationDto) {
    const organizationId = await this.aiCommerceMetricsService.resolveOrganizationScope(
      principal,
      query.organizationId,
    );

    const trust = await this.aiDataTrustService.getTrustForOrganization(organizationId);
    
    const shopifyConnected = trust.integrations.shopify.connected;
    const shopifyFirstSyncCompleted = !!trust.integrations.shopify.lastSuccessfulSyncAt;
    const stripeConnected = trust.integrations.stripe.connected;
    const stripeFirstSyncCompleted = !!trust.integrations.stripe.lastSuccessfulSyncAt;
    
    // Check if we have enough data for a first brief
    // We consider it ready if Shopify is synced
    const firstBriefReady = shopifyFirstSyncCompleted;

    const stepsCompleted: AiOnboardingStep[] = [];
    if (shopifyConnected) stepsCompleted.push(AiOnboardingStep.CONNECT_STORE);
    if (shopifyFirstSyncCompleted) stepsCompleted.push(AiOnboardingStep.INITIAL_SHOPIFY_SYNC);
    if (stripeConnected) stepsCompleted.push(AiOnboardingStep.CONNECT_PAYMENTS);
    if (stripeFirstSyncCompleted) stepsCompleted.push(AiOnboardingStep.INITIAL_STRIPE_SYNC);
    if (firstBriefReady) stepsCompleted.push(AiOnboardingStep.FIRST_BRIEF_READY);

    const onboardingCompleted = stepsCompleted.length === Object.values(AiOnboardingStep).length;

    // Determine current step
    let currentStep: AiOnboardingStep = AiOnboardingStep.CONNECT_STORE;
    if (!shopifyConnected) {
      currentStep = AiOnboardingStep.CONNECT_STORE;
    } else if (!shopifyFirstSyncCompleted) {
      currentStep = AiOnboardingStep.INITIAL_SHOPIFY_SYNC;
    } else if (!stripeConnected) {
      currentStep = AiOnboardingStep.CONNECT_PAYMENTS;
    } else if (!stripeFirstSyncCompleted) {
      currentStep = AiOnboardingStep.INITIAL_STRIPE_SYNC;
    } else if (!firstBriefReady) {
      currentStep = AiOnboardingStep.FIRST_BRIEF_READY;
    } else {
      currentStep = AiOnboardingStep.FIRST_BRIEF_READY; // Last step
    }

    const previousStatus = await this.prismaService.aiOnboardingStatus.findUnique({
      where: { organizationId },
    });

    const updatedStatus = await this.prismaService.aiOnboardingStatus.upsert({
      where: { organizationId },
      create: {
        organizationId,
        currentStep,
        stepsCompleted,
        shopifyConnected,
        shopifyFirstSyncCompleted,
        stripeConnected,
        stripeFirstSyncCompleted,
        onboardingCompleted,
      },
      update: {
        currentStep,
        stepsCompleted,
        shopifyConnected,
        shopifyFirstSyncCompleted,
        stripeConnected,
        stripeFirstSyncCompleted,
        onboardingCompleted,
      },
    });

    this.logger.debug({
      event: 'ai.onboarding.refreshed',
      organizationId,
      currentStep,
      completedCount: stepsCompleted.length,
    });

    if (
      updatedStatus.shopifyFirstSyncCompleted &&
      !previousStatus?.shopifyFirstSyncCompleted
    ) {
      await this.commerceAgentOrchestrationService.emitOnboardingCompletionTrigger(
        principal,
        organizationId,
        AiOnboardingStep.INITIAL_SHOPIFY_SYNC,
      );
    }

    return buildSuccessResponse('Onboarding status refreshed successfully.', updatedStatus);
  }

  async completeOnboardingStep(principal: CurrentPrincipal, step: AiOnboardingStep, organizationId?: string) {
    const resolvedOrgId = await this.aiCommerceMetricsService.resolveOrganizationScope(
      principal,
      organizationId,
    );

    const status = await this.prismaService.aiOnboardingStatus.findUnique({
      where: { organizationId: resolvedOrgId },
    });

    if (!status) {
      throw new Error('Onboarding status not found');
    }

    if (!status.stepsCompleted.includes(step)) {
      await this.prismaService.aiOnboardingStatus.update({
        where: { organizationId: resolvedOrgId },
        data: {
          stepsCompleted: {
            push: step,
          },
        },
      });

      await this.prismaService.aiOnboardingAudit.create({
        data: {
          organizationId: resolvedOrgId,
          step,
          action: 'MANUAL_COMPLETE',
        },
      });
    }

    return this.refreshOnboardingStatus(principal, { organizationId: resolvedOrgId });
  }
}
