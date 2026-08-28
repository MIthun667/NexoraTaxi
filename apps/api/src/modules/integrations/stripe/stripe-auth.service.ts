import { BadRequestException, Injectable } from '@nestjs/common';

@Injectable()
export class StripeAuthService {
  validateSecretKey(secretKey: string) {
    const normalized = secretKey.trim();

    if (!/^sk_(live|test)_[A-Za-z0-9]+$/.test(normalized)) {
      throw new BadRequestException({
        message: 'The provided Stripe secret key is invalid.',
        error: {
          code: 'invalid_stripe_secret_key',
        },
      });
    }

    return normalized;
  }
}
