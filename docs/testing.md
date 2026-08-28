# Testing strategy

## Local safety

Automated integration and migration verification must never target a developer's normal Nexora database. Use a dedicated PostgreSQL database or an isolated disposable PostgreSQL container.

A safe local test database can use a URL such as:

```text
postgresql://nexora_test:nexora_test_password@127.0.0.1:5433/nexora_test?schema=public
```

Do not reuse the normal development `DATABASE_URL` unless it points to a database created specifically for tests.

## Test commands

```bash
pnpm prisma:generate
pnpm test:unit
pnpm test:integration
pnpm test:ci
```

The security test suite covers fail-closed authentication, permission enforcement, tenant boundaries, JWT token purpose, Shopify OAuth/HMAC checks, and webhook raw-body requirements.

## CI database

GitHub Actions starts a disposable PostgreSQL 16 service named `nexora_test`. The workflow injects only non-production test credentials. It then executes the repository's full Prisma migration history with:

```bash
pnpm prisma migrate deploy
```

against that empty database. This verifies that production migrations are deployable from migration history rather than relying on `prisma db push`.

## Test isolation

Tests should create or mock only the state required by each case. Any future database-backed integration suites must clean up their own records or use a fresh schema/database per run so tests remain deterministic and do not depend on ordering.
