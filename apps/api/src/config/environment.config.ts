import { registerAs } from '@nestjs/config';

export interface EnvironmentConfiguration {
  apiPrefix: string;
  appName: string;
  appVersion: string;
  authRateLimitLimit: number;
  authRateLimitTtl: number;
  corsOrigins: string[];
  devAuthUserEmail?: string;
  databaseUrl: string;
  jwtAccessExpires: string;
  jwtAccessSecret: string;
  jwtRefreshExpires: string;
  jwtRefreshSecret: string;
  encryptionKey: string;
  nodeEnv: string;
  ollamaBaseUrl: string;
  ollamaHealthcheckEnabled: boolean;
  ollamaMaxRetries: number;
  ollamaModel: string;
  ollamaTimeoutMs: number;
  port: number;
  shopifyApiKey: string;
  shopifyApiSecret: string;
  shopifyScopes: string[];
  shopifyRedirectUri: string;
  shopifyAppUrl: string;
  shopifyApiVersion: string;
  shopifyWebhookBaseUrl: string;
  stripeApiBaseUrl: string;
  trustProxy: boolean;
}

export default registerAs(
  'environment',
  (): EnvironmentConfiguration => ({
    apiPrefix: process.env.API_PREFIX ?? 'api/v1',
    appName: process.env.APP_NAME ?? 'Nexora Platform API',
    appVersion: process.env.APP_VERSION ?? '0.1.0',
    authRateLimitLimit: Number(process.env.AUTH_RATE_LIMIT_LIMIT ?? 10),
    authRateLimitTtl: Number(process.env.AUTH_RATE_LIMIT_TTL ?? 60),
    corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000,http://localhost:3001')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    devAuthUserEmail: process.env.DEV_AUTH_USER_EMAIL?.trim() || undefined,
    databaseUrl: process.env.DATABASE_URL ?? '',
    jwtAccessExpires: process.env.JWT_ACCESS_EXPIRES ?? '15m',
    jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? '',
    jwtRefreshExpires: process.env.JWT_REFRESH_EXPIRES ?? '7d',
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
    encryptionKey: process.env.ENCRYPTION_KEY ?? '',
    nodeEnv: process.env.NODE_ENV ?? 'development',
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
    ollamaHealthcheckEnabled: process.env.OLLAMA_HEALTHCHECK_ENABLED !== 'false',
    ollamaMaxRetries: Number(process.env.OLLAMA_MAX_RETRIES ?? 2),
    ollamaModel: process.env.OLLAMA_MODEL ?? 'qwen2.5:7b-instruct',
    ollamaTimeoutMs: Number(process.env.OLLAMA_TIMEOUT_MS ?? 15000),
    port: Number(process.env.PORT ?? 3000),
    shopifyApiKey: process.env.SHOPIFY_API_KEY ?? '',
    shopifyApiSecret: process.env.SHOPIFY_API_SECRET ?? '',
    shopifyScopes: (process.env.SHOPIFY_SCOPES ?? 'read_orders,read_products,read_customers')
      .split(',')
      .map((scope) => scope.trim())
      .filter(Boolean),
    shopifyRedirectUri: process.env.SHOPIFY_REDIRECT_URI ?? '',
    shopifyAppUrl: process.env.SHOPIFY_APP_URL ?? '',
    shopifyApiVersion: process.env.SHOPIFY_API_VERSION ?? '2026-01',
    shopifyWebhookBaseUrl: process.env.SHOPIFY_WEBHOOK_BASE_URL ?? '',
    stripeApiBaseUrl: process.env.STRIPE_API_BASE_URL ?? 'https://api.stripe.com/v1',
    trustProxy: process.env.TRUST_PROXY === 'true',
  }),
);
