import { Injectable } from '@nestjs/common';

import {
  IntelligenceContext,
  IntelligenceRecommendation,
  IntelligenceSignal,
} from './intelligence.types';

@Injectable()
export class RecommendationEngine {
  buildRecommendations(
    context: IntelligenceContext,
    signals: IntelligenceSignal[],
  ): IntelligenceRecommendation[] {
    const recommendations: IntelligenceRecommendation[] = [];

    if (
      signals.some((signal) =>
        ['shopify-order-data-restricted', 'shopify-customer-data-restricted'].includes(signal.id),
      )
    ) {
      recommendations.push({
        title: 'Unlock Shopify protected data access',
        description:
          'Enable Shopify order and customer access so Nexora can generate full revenue and retention intelligence.',
        priority: 'high',
        actions: [
          'Request Shopify protected customer data approval',
          'Reconnect the app if Shopify issues a refreshed token',
          'Re-run the Shopify sync',
        ],
      });
    }

    if (!context.hasStripe) {
      recommendations.push({
        title: 'Connect Stripe for payment visibility',
        description:
          'Enable refund, payment failure, and confirmed revenue intelligence with Stripe data.',
        priority: 'high',
        actions: [
          'Connect the Stripe account',
          'Run the first Stripe sync',
        ],
      });
    }

    if (context.productsCount === 0) {
      recommendations.push({
        title: 'Run the first Shopify sync',
        description:
          'Sync the Shopify catalog so Nexora can activate product-level intelligence.',
        priority: 'high',
        actions: [
          'Start Shopify sync',
          'Verify products were imported successfully',
        ],
      });
    }

    if (context.hasOrderAccess && context.ordersToday === 0) {
      recommendations.push({
        title: 'Review demand inputs',
        description:
          'Verify storefront traffic, promotions, and checkout health because no Shopify orders were observed today.',
        priority: 'medium',
        actions: [
          'Check storefront availability',
          'Review active campaigns and channels',
        ],
      });
    }

    return recommendations;
  }
}
