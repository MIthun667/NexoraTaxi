import { Injectable } from '@nestjs/common';

import { IntelligenceContext, IntelligenceSignal } from './intelligence.types';

@Injectable()
export class SignalEngine {
  buildSignals(context: Omit<IntelligenceContext, 'signals'>): IntelligenceSignal[] {
    const signals: IntelligenceSignal[] = [];

    if (context.productsCount === 0) {
      signals.push({
        id: 'products-not-synced',
        severity: 'high',
        title: 'No products synced',
        description:
          'Nexora cannot produce commerce intelligence until the Shopify product catalog is synced.',
      });
    }

    if (!context.hasStripe) {
      signals.push({
        id: 'refund-visibility-gap',
        severity: 'low',
        title: 'Refund visibility gap',
        description:
          'Stripe is not connected, so refunds and payment outcomes cannot be verified.',
      });
    }

    if (!context.hasOrderAccess) {
      signals.push({
        id: 'shopify-order-data-restricted',
        severity: 'high',
        title: 'Shopify order data restricted',
        description:
          'Shopify order access is unavailable, so revenue and demand signals remain incomplete.',
      });
    }

    if (!context.hasCustomerAccess) {
      signals.push({
        id: 'shopify-customer-data-restricted',
        severity: 'high',
        title: 'Shopify customer data restricted',
        description:
          'Shopify customer access is unavailable, so customer behavior and retention intelligence are suppressed.',
      });
    }

    if (context.hasOrderAccess && context.ordersToday === 0) {
      signals.push({
        id: 'no-orders-today',
        severity: 'medium',
        title: 'No orders today',
        description: 'Shopify has not reported any orders today.',
      });
    }

    return signals;
  }
}
