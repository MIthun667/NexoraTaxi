'use client';

import React from 'react';
import type { Route } from 'next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { OnboardingStepCard, OnboardingStepId } from './onboarding-step-card';
import { useRouter } from 'next/navigation';

interface AiOnboardingStatus {
  currentStep: OnboardingStepId;
  stepsCompleted: OnboardingStepId[];
  onboardingCompleted: boolean;
}

interface OnboardingProgressCardProps {
  status: AiOnboardingStatus;
}

export function OnboardingProgressCard({ status }: OnboardingProgressCardProps) {
  const router = useRouter();
  const completedCount = status.stepsCompleted.length;
  const totalSteps = 5;
  const progressPercent = (completedCount / totalSteps) * 100;

  const steps: Array<{
    id: OnboardingStepId;
    title: string;
    description: string;
    actionLabel: string;
    actionPath: Route;
  }> = [
    {
      id: 'CONNECT_STORE',
      title: 'Connect your Store',
      description: 'Link your Shopify store to enable commerce insights.',
      actionLabel: 'Connect Shopify',
      actionPath: '/shopify/connected-stores'
    },
    {
      id: 'INITIAL_SHOPIFY_SYNC',
      title: 'First Store Sync',
      description: 'We are importing your products and orders.',
      actionLabel: 'Check Progress',
      actionPath: '/shopify/sync-health'
    },
    {
      id: 'CONNECT_PAYMENTS',
      title: 'Connect Payments',
      description: 'Connect Stripe for full visibility into revenue and refunds.',
      actionLabel: 'Connect Stripe',
      actionPath: '/shopify/finance-intelligence'
    },
    {
      id: 'INITIAL_STRIPE_SYNC',
      title: 'First Payment Sync',
      description: 'Linking payment data to your commerce events.',
      actionLabel: 'Refresh Data Status',
      actionPath: '/shopify/sync-health'
    },
    {
      id: 'FIRST_BRIEF_READY',
      title: 'Daily Brief Ready',
      description: 'Your first AI daily brief is being prepared.',
      actionLabel: 'Go to Dashboard',
      actionPath: '/shopify/overview'
    }
  ];

  const handleAction = (id: OnboardingStepId) => {
    const step = steps.find(s => s.id === id);
    if (step) {
      router.push(step.actionPath);
    }
  };

  const getStepStatus = (id: OnboardingStepId, index: number) => {
    if (status.stepsCompleted.includes(id)) {
      return 'completed';
    }
    
    // Check if previous step is completed
    const prevSteps = steps.slice(0, index);
    const isPreviousCompleted = prevSteps.every(s => status.stepsCompleted.includes(s.id));

    if (isPreviousCompleted) {
      if (status.currentStep === id) {
        return 'in_progress'; // Actually the backend tells us the current step, 
                             // but we might want to show it as pending if it needs user action
      }
      return 'pending';
    }

    return 'locked';
  };

  if (status.onboardingCompleted) {
    return null;
  }

  return (
    <Card className="border-primary/20 shadow-lg bg-gradient-to-br from-card to-primary/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-2xl font-bold tracking-tight">Welcome to Nexora</CardTitle>
            <CardDescription className="text-base">
              Complete your setup to unlock full AI-driven insights for your business.
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-primary mb-1">
              Step {completedCount} of {totalSteps}
            </div>
            <div className="text-2xl font-bold text-primary">
              {Math.round(progressPercent)}%
            </div>
          </div>
        </div>
        <Progress value={progressPercent} className="h-3 mt-4" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {steps.map((step, index) => (
            <OnboardingStepCard
              key={step.id}
              id={step.id}
              title={step.title}
              description={step.description}
              status={getStepStatus(step.id, index)}
              actionLabel={step.actionLabel}
              onAction={handleAction}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
