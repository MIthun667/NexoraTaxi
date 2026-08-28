import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StripeCryptoService {
  constructor(private readonly configService: ConfigService) {}

  encrypt(text: string): string {
    const key = this.getKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return [iv.toString('hex'), authTag.toString('hex'), encrypted.toString('hex')].join('.');
  }

  decrypt(value: string): string {
    const [ivHex, tagHex, payloadHex] = value.split('.');
    if (!ivHex || !tagHex || !payloadHex) {
      throw new InternalServerErrorException({
        message: 'Stored Stripe credential could not be decrypted.',
        code: 'invalid_encrypted_token',
      });
    }

    try {
      const key = this.getKey();
      const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
      decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(payloadHex, 'hex')),
        decipher.final(),
      ]);
      return decrypted.toString('utf8');
    } catch {
      throw new InternalServerErrorException({
        message: 'Stored Stripe credential could not be decrypted.',
        code: 'invalid_encrypted_token',
      });
    }
  }

  private getKey(): Buffer {
    const rawKey = this.configService.get<string>('environment.encryptionKey', '');
    if (!rawKey) {
      throw new InternalServerErrorException({
        message: 'Stripe encryption configuration is missing.',
        code: 'missing_stripe_configuration',
      });
    }

    return createHash('sha256').update(rawKey).digest();
  }
}
