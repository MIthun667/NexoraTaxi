import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  PrismaClientInitializationError,
  PrismaClientKnownRequestError,
  PrismaClientValidationError,
} from '@prisma/client/runtime/library';

export class PrismaErrorMapper {
  static toHttpException(error: unknown) {
    if (error instanceof PrismaClientInitializationError) {
      return new ServiceUnavailableException({
        code: 'DATABASE_UNAVAILABLE',
        message: 'The database is currently unavailable.',
      });
    }

    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const targets = Array.isArray(error.meta?.target)
          ? error.meta.target.join(', ')
          : 'resource fields';

        return new ConflictException({
          code: 'RESOURCE_CONFLICT',
          message: 'Resource already exists.',
          details: { target: targets },
        });
      }

      if (error.code === 'P2003') {
        return new BadRequestException({
          code: 'REFERENCE_INTEGRITY_VIOLATION',
          message: 'Referenced entity could not be resolved.',
        });
      }

      if (error.code === 'P2025') {
        return new NotFoundException({
          code: 'RESOURCE_NOT_FOUND',
          message: 'The requested resource was not found.',
        });
      }

      return new BadRequestException({
        code: 'DATABASE_REQUEST_ERROR',
        message: 'The request could not be completed.',
      });
    }

    if (error instanceof PrismaClientValidationError) {
      return new BadRequestException({
        code: 'DATABASE_VALIDATION_ERROR',
        message: 'The request payload could not be processed.',
      });
    }

    return null;
  }
}
