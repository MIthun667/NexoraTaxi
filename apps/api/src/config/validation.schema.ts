import * as Joi from 'joi';

export const validationSchema = Joi.object({
  API_PREFIX: Joi.string().trim().default('api/v1'),
  APP_NAME: Joi.string().trim().default('Nexora Platform API'),
  APP_VERSION: Joi.string().trim().default('0.1.0'),
  AUTH_RATE_LIMIT_LIMIT: Joi.number().integer().min(1).max(1000).default(10),
  AUTH_RATE_LIMIT_TTL: Joi.number().integer().min(1).max(3600).default(60),
  CORS_ORIGINS: Joi.string().trim().default('http://localhost:3000,http://localhost:3001'),
  DATABASE_URL: Joi.string().uri({ scheme: ['postgresql', 'postgres'] }).required(),
  DEV_AUTH_USER_EMAIL: Joi.string()
    .email({ tlds: { allow: false } })
    .default('admin@northstar-universal.demo'),
  JWT_ACCESS_EXPIRES: Joi.string().trim().default('15m'),
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_EXPIRES: Joi.string().trim().default('7d'),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  ENCRYPTION_KEY: Joi.string().min(32).required(),
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  OLLAMA_BASE_URL: Joi.string().uri({ scheme: ['http', 'https'] }).default('http://localhost:11434'),
  OLLAMA_HEALTHCHECK_ENABLED: Joi.boolean().truthy('true').falsy('false').default(true),
  OLLAMA_MAX_RETRIES: Joi.number().integer().min(0).max(5).default(2),
  OLLAMA_MODEL: Joi.string().trim().default('qwen2.5:7b-instruct'),
  OLLAMA_TIMEOUT_MS: Joi.number().integer().min(1000).max(120000).default(15000),
  PORT: Joi.number().port().default(3000),
  SHOPIFY_API_KEY: Joi.string().trim().required(),
  SHOPIFY_API_SECRET: Joi.string().trim().required(),
  SHOPIFY_SCOPES: Joi.string().trim().required(),
  SHOPIFY_REDIRECT_URI: Joi.string().uri({ scheme: ['http', 'https'] }).required(),
  SHOPIFY_APP_URL: Joi.string().uri({ scheme: ['http', 'https'] }).required(),
  SHOPIFY_API_VERSION: Joi.string().trim().default('2026-01'),
  SHOPIFY_WEBHOOK_BASE_URL: Joi.string().uri({ scheme: ['http', 'https'] }).required(),
  STRIPE_API_BASE_URL: Joi.string().uri({ scheme: ['http', 'https'] }).default('https://api.stripe.com/v1'),
  TRUST_PROXY: Joi.boolean().truthy('true').falsy('false').default(false),
});
