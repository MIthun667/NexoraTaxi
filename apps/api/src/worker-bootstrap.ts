import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { WorkerModule } from './worker.module';

async function bootstrapWorker(): Promise<void> {
  const logger = new Logger('WorkerBootstrap');
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    bufferLogs: true,
  });
  app.enableShutdownHooks();

  logger.log('Durable BullMQ worker initialized and consuming jobs.');

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    logger.warn(`Received ${signal}. Draining active jobs and closing worker resources...`);

    try {
      await app.close();
      logger.log('Worker shutdown completed cleanly.');
    } catch (error) {
      process.exitCode = 1;
      logger.error(
        error instanceof Error ? error.stack ?? error.message : 'Unknown worker shutdown failure',
      );
    }
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
  process.exitCode = 1;
  logger.error(error instanceof Error ? error.stack ?? error.message : 'Unknown worker bootstrap failure');
});
