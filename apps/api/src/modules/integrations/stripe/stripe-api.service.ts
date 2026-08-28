import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PlatformLoggerService } from '../../../common/services/platform-logger.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { StripeChargeRecord } from './interfaces/stripe-charge.interface';
import { StripePaymentEventRecord } from './interfaces/stripe-payment-event.interface';
import { StripeAccountProfile } from './interfaces/stripe-account.interface';
import { StripeCryptoService } from './stripe-crypto.service';

@Injectable()
export class StripeApiService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly stripeCryptoService: StripeCryptoService,
    private readonly configService: ConfigService,
    private readonly logger: PlatformLoggerService,
  ) {}

  async getAccount(secretKey: string) {
    return this.request<StripeAccountProfile>(secretKey, '/accounts/me', 'failed_to_fetch_stripe_account');
  }

  async getCharges(secretKey: string, limit = 50) {
    const response = await this.request<{ data: StripeChargeRecord[] }>(
      secretKey,
      `/charges?limit=${limit}`,
      'failed_to_fetch_stripe_charges',
    );
    return response.data ?? [];
  }

  async getPaymentEvents(secretKey: string, limit = 50) {
    const query = new URLSearchParams();
    query.set('limit', String(limit));
    ['charge.failed', 'charge.refunded', 'charge.dispute.created', 'charge.succeeded'].forEach(
      (type) => query.append('types[]', type),
    );

    const response = await this.request<{ data: StripePaymentEventRecord[] }>(
      secretKey,
      `/events?${query.toString()}`,
      'failed_to_fetch_stripe_payment_events',
    );
    return response.data ?? [];
  }

  async getActiveAccountForOrganization(organizationId: string) {
    const account = await this.prismaService.integrationStripeAccount.findFirst({
      where: {
        organizationId,
        isActive: true,
      },
      orderBy: { connectedAt: 'desc' },
    });

    if (!account) {
      throw new InternalServerErrorException({
        message: 'No active Stripe account is connected for this organization.',
        code: 'stripe_account_not_connected',
      });
    }

    return {
      ...account,
      secretKey: this.stripeCryptoService.decrypt(account.accessTokenCipher),
    };
  }

  private async request<T>(secretKey: string, path: string, errorCode: string) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`,
      },
    });

    if (!response.ok) {
      const payload = await response.text().catch(() => '');
      this.logger.warn({
        event: 'stripe.api.failed',
        path,
        statusCode: response.status,
        errorCode,
      });
      throw new BadGatewayException({
        message: 'Stripe API request failed.',
        error: {
          code: errorCode,
          details: payload || `Stripe API returned ${response.status}.`,
        },
      });
    }

    return (await response.json()) as T;
  }

  private get baseUrl() {
    return this.configService
      .get<string>('environment.stripeApiBaseUrl', 'https://api.stripe.com/v1')
      .replace(/\/$/, '');
  }
}
