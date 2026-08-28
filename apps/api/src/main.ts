import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';
import { TrimStringsPipe } from './common/pipes/trim-strings.pipe';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    rawBody: true,
  });

  const configService = app.get(ConfigService);
  const prismaService = app.get(PrismaService);

  const apiPrefix = configService.get<string>('environment.apiPrefix', 'api/v1');
  const port = configService.get<number>('environment.port', 3000);
  const appName = configService.get<string>('environment.appName', 'Nexora Platform API');
  const trustProxy = configService.get<boolean>('environment.trustProxy', false);
  const corsOrigins = configService.get<string[]>(
    'environment.corsOrigins',
    ['http://localhost:3000', 'http://localhost:3001'],
  );

  app.getHttpAdapter().getInstance().disable('x-powered-by');
  app.getHttpAdapter().getInstance().set('trust proxy', trustProxy);
  app.setGlobalPrefix(apiPrefix);
  app.enableCors({
    origin: corsOrigins.includes('*') ? true : corsOrigins,
    credentials: true,
  });
  app.useGlobalPipes(
    new TrimStringsPipe(),
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      stopAtFirstError: true,
      validateCustomDecorators: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.useGlobalFilters(app.get(HttpExceptionFilter));
  app.useGlobalInterceptors(new ResponseTransformInterceptor());
  app.enableShutdownHooks();

  await prismaService.enableShutdownHooks(app);
  await app.listen(port);

  process.stdout.write(`${appName} initialized successfully on port ${port}\n`);
}

void bootstrap();
