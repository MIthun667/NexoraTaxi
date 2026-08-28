import {
  INestApplication,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {
    super();
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.isConnected = true;
      this.logger.log('Prisma database connection established');
    } catch (error) {
      this.isConnected = false;
      const nodeEnv = this.configService.get<string>('environment.nodeEnv', 'development');

      if (nodeEnv === 'production') {
        throw error;
      }

      const message = error instanceof Error ? error.message : 'Unknown database connection error';
      this.logger.warn(
        `Prisma could not connect during startup. Continuing without an active database connection in ${nodeEnv} mode. ${message}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  isDatabaseAvailable(): boolean {
    return this.isConnected;
  }

  async enableShutdownHooks(app: INestApplication): Promise<void> {
    process.once('beforeExit', async () => {
      await app.close();
    });
  }
}
