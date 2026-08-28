'use client';

import React from 'react';
import { CheckCircle2, Circle, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type OnboardingStepId = 
  | 'CONNECT_STORE'
  | 'INITIAL_SHOPIFY_SYNC'
  | 'CONNECT_PAYMENTS'
  | 'INITIAL_STRIPE_SYNC'
  | 'FIRST_BRIEF_READY';

interface OnboardingStepCardProps {
  id: OnboardingStepId;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'locked';
  onAction?: (id: OnboardingStepId) => void;
  actionLabel?: string;
}

export function OnboardingStepCard({
  id,
  title,
  description,
  status,
  onAction,
  actionLabel,
}: OnboardingStepCardProps) {
  const isCompleted = status === 'completed';
  const isInProgress = status === 'in_progress';
  const isLocked = status === 'locked';
  const isPending = status === 'pending';

  return (
    <Card className={cn(
      "transition-all duration-300",
      isCompleted ? "bg-muted/50 opacity-80" : "bg-card shadow-sm",
      isInProgress && "ring-2 ring-primary ring-offset-2",
      isLocked && "opacity-60"
    )}>
      <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
        <div className="flex flex-col gap-1">
          <CardTitle className={cn(
            "text-lg font-semibold flex items-center gap-2",
            isCompleted && "text-muted-foreground line-through"
          )}>
            {isCompleted ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : isInProgress ? (
              <Loader2 className="h-5 w-5 text-primary animate-spin" />
            ) : isLocked ? (
              <Circle className="h-5 w-5 text-muted-foreground" />
            ) : (
              <Circle className="h-5 w-5 text-primary" />
            )}
            {title}
          </CardTitle>
          <CardDescription className="text-sm">
            {description}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {isPending && onAction && actionLabel && (
          <Button 
            size="sm" 
            onClick={() => onAction(id)}
            className="w-full mt-2"
          >
            {actionLabel}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
        {isInProgress && (
          <div className="flex items-center gap-2 text-xs text-primary font-medium mt-2 animate-pulse">
            Processing... This might take a few moments.
          </div>
        )}
        {isCompleted && (
          <div className="text-xs text-green-600 font-medium mt-2 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Step completed successfully.
          </div>
        )}
        {isLocked && (
          <div className="text-xs text-muted-foreground mt-2">
            Complete previous steps to unlock.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
