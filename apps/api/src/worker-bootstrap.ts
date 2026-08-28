import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

async function bootstrapWorker(): Promise<void> {
  const logger = new Logger('WorkerBootstrap');
  const app = await NestFactory.createApplicationContext(AppModule, {
    bufferLogs: true,
  });

  logger.log('Background worker context initialized successfully.');

  const shutdown = async (signal: string) => {
    logger.warn(`Received ${signal}. Shutting down worker context...`);
    await app.close();
    process.exit(0);
  };

  process.once('SIGINT', () => {
    void shutdown('SIGINT');
  });

  process.once('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
}

void bootstrapWorker().catch((error) => {
  const logger = new Logger('WorkerBootstrap');
  logger.error(error instanceof Error ? error.stack ?? error.message : 'Unknown worker bootstrap failure');
  process.exit(1);
});
