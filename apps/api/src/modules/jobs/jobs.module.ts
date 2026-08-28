import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { buildDefaultJobOptions, buildQueuePrefix, parseRedisConnection } from './job-config.util';
import { JOB_QUEUE_NAMES } from './job.constants';
import { JobsService } from './jobs.service';
import { RedisService } from './redis.service';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: parseRedisConnection(
          configService.getOrThrow<string>('environment.redisUrl'),
        ),
        prefix: buildQueuePrefix(
          configService.get<string>('environment.jobQueuePrefix', 'nexora'),
          configService.get<string>('environment.nodeEnv', 'development'),
        ),
        defaultJobOptions: buildDefaultJobOptions(
          configService.get<number>('environment.jobDefaultAttempts', 3),
          configService.get<number>('environment.jobBackoffMs', 1000),
        ),
      }),
    }),
    BullModule.registerQueue(
      { name: JOB_QUEUE_NAMES.integration },
      { name: JOB_QUEUE_NAMES.intelligence },
      { name: JOB_QUEUE_NAMES.system },
      { name: JOB_QUEUE_NAMES.deadLetter },
    ),
  ],
  providers: [RedisService, JobsService],
  exports: [BullModule, RedisService, JobsService],
})
export class JobsModule {}
