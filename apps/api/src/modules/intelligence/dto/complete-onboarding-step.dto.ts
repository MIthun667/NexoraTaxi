import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AiOnboardingStep } from '@prisma/client';

export class CompleteOnboardingStepDto {
  @IsEnum(AiOnboardingStep)
  step: AiOnboardingStep;

  @IsOptional()
  @IsString()
  organizationId?: string;
}
