import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ShopifyWebhookValidatorService {
  constructor(private readonly configService: ConfigService) {}

  validateSignature(rawBody: Buffer, hmacHeader?: string | string[] | undefined) {
    const signature = Array.isArray(hmacHeader) ? hmacHeader[0] : hmacHeader;

    if (!signature) {
      throw new BadRequestException({
        message: 'The Shopify webhook signature is missing.',
        code: 'invalid_shopify_webhook_signature',
      });
    }

    const expected = createHmac('sha256', this.getRequiredSecret())
      .update(rawBody)
      .digest('base64');

    const signatureBuffer = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expected, 'utf8');

    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      throw new BadRequestException({
        message: 'The Shopify webhook signature could not be verified.',
        code: 'invalid_shopify_webhook_signature',
      });
    }
  }

  hashPayload(rawBody: Buffer) {
    return createHash('sha256').update(rawBody).digest('hex');
  }

  private getRequiredSecret() {
    const secret = (this.configService.get('environment') as { shopifyApiSecret: string })
      .shopifyApiSecret;

    if (!secret) {
      throw new InternalServerErrorException({
        message: 'Shopify webhook configuration is missing.',
        code: 'missing_shopify_webhook_configuration',
      });
    }

    return secret;
  }
}
