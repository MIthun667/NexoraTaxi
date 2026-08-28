import { Injectable } from '@nestjs/common';

import { PlatformLoggerService } from '../../common/services/platform-logger.service';
import { RequestContextStorage } from '../../common/utils/request-context.util';
import { LogContext } from './observability.types';

@Injectable()
export class LoggingService {
  constructor(private readonly platformLoggerService: PlatformLoggerService) {}

  log(entry: LogContext) {
    this.platformLoggerService.log(this.decorate(entry));
  }

  warn(entry: LogContext) {
    this.platformLoggerService.warn(this.decorate(entry));
  }

  error(entry: LogContext) {
    this.platformLoggerService.error(this.decorate(entry));
  }

  debug(entry: LogContext) {
    this.platformLoggerService.debug(this.decorate(entry));
  }

  private decorate(entry: LogContext) {
    return {
      requestId: RequestContextStorage.getRequestId() ?? null,
      ...entry,
    };
  }
}
