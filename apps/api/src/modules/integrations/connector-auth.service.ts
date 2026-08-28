import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ConnectorAuthService {
  constructor(private readonly configService: ConfigService) {}

  encryptSecret(secret: string): string {
    const key = this.getKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return [iv.toString('hex'), authTag.toString('hex'), encrypted.toString('hex')].join('.');
  }

  decryptSecret(value: string): string {
    const [ivHex, tagHex, payloadHex] = value.split('.');
    if (!ivHex || !tagHex || !payloadHex) {
      return value;
    }

    const key = this.getKey();
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(payloadHex, 'hex')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  }

  private getKey(): Buffer {
    const base = this.configService.get<string>('CONNECTOR_SECRET_KEY') ?? 'demo-connector-secret-key';
    return createHash('sha256').update(base).digest();
  }
}
