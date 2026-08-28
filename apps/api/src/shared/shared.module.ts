import { Global, Module } from '@nestjs/common';

import { HttpExceptionFilter } from '../common/filters/http-exception.filter';
import { PlatformLoggerService } from '../common/services/platform-logger.service';

@Global()
@Module({
  providers: [PlatformLoggerService, HttpExceptionFilter],
  exports: [PlatformLoggerService, HttpExceptionFilter],
})
export class SharedModule {}
