import { Injectable, Logger } from '@nestjs/common';

type LogLevel = 'log' | 'warn' | 'error' | 'debug';

@Injectable()
export class PlatformLoggerService {
  private readonly logger = new Logger('NexoraPlatform');

  log(entry: Record<string, unknown>) {
    this.write('log', entry);
  }

  warn(entry: Record<string, unknown>) {
    this.write('warn', entry);
  }

  error(entry: Record<string, unknown>) {
    this.write('error', entry);
  }

  debug(entry: Record<string, unknown>) {
    this.write('debug', entry);
  }

  private write(level: LogLevel, entry: Record<string, unknown>) {
    this.logger[level](JSON.stringify(entry));
  }
}
