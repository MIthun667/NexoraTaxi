import { Injectable } from '@nestjs/common';

import { IntelligenceContext, IntelligenceInsight, IntelligenceSignal } from './intelligence.types';

@Injectable()
export class InsightEngine {
  buildInsights(
    context: IntelligenceContext,
    signals: IntelligenceSignal[],
  ): IntelligenceInsight[] {
    const insights: IntelligenceInsight[] = [];

    if (context.productsCount > 0) {
      insights.push({
        id: 'product-visibility-active',
        category: 'commerce',
        title: 'Product visibility is active',
        description: `Nexora can evaluate the synced product catalog across ${context.productsCount} product${context.productsCount === 1 ? '' : 's'}.`,
      });
    }

    if (signals.some((signal) => signal.id === 'shopify-order-data-restricted')) {
      insights.push({
        id: 'order-coverage-limited',
        category: 'coverage',
        title: 'Revenue coverage is incomplete',
        description:
          'Revenue and order trend visibility remain incomplete because Shopify order access is restricted.',
      });
    }

    if (signals.some((signal) => signal.id === 'shopify-customer-data-restricted')) {
      insights.push({
        id: 'customer-coverage-limited',
        category: 'customer',
        title: 'Customer intelligence is unavailable',
        description:
          'Customer behavior and retention cannot be evaluated because Shopify customer access is restricted.',
      });
    }

    if (signals.some((signal) => signal.id === 'refund-visibility-gap')) {
      insights.push({
        id: 'payment-visibility-limited',
        category: 'finance',
        title: 'Refund behavior cannot be evaluated',
        description:
          'Refund and payment behavior cannot be evaluated because Stripe is not connected.',
      });
    }

    if (signals.some((signal) => signal.id === 'no-orders-today')) {
      insights.push({
        id: 'no-orders-observed',
        category: 'commerce',
        title: 'No order activity observed',
        description: 'No Shopify orders have been recorded today.',
      });
    }

    return insights;
  }
}
