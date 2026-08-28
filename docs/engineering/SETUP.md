# Engineering Setup Guide

This guide provides technical instructions for setting up the AI Company Operating System development environment.

## 1. Prerequisites

Ensure the following are installed on your system:
- **Node.js**: v24.x or higher
- **pnpm**: v10.x or higher
- **Docker**: For running database and AI runtime dependencies
- **PostgreSQL**: v16+ (if running locally without Docker)

## 2. Environment Configuration

1. Clone the repository and install dependencies:
   ```bash
   pnpm install
   ```

2. Create a `.env` file from the provided template:
   ```bash
   cp .env.example .env
   ```

3. Update the `.env` file with your local database and AI provider credentials.

## 3. Database Initialization

Sync the local database schema and run the initial core organization migrations:

```bash
pnpm prisma generate
npx prisma migrate deploy
npx prisma db push
```

*Note: For internal development environments, use `pnpm db:seed` to populate the workspace with local telemetry baseline data.*

## 4. Starting the Workspace

The platform consists of a NestJS API and a Next.js Frontend.

### Start Backend (API)
```bash
pnpm start:dev
```

### Start Frontend (Web)
```bash
pnpm web:dev
```

The Command Center will be available at `http://localhost:3001`.

## 5. Development Utilities

- **Prisma Studio**: `npx prisma studio` (Visualize local data)
- **Standardize Passwords**: `npm run db:standardize-passwords` (Internal dev tool for credential alignment)
- **Telemetry Backfill**: `npm run db:backfill-universal` (Populate operational layer baseline)
