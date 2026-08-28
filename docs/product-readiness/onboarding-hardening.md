# Onboarding Hardening

Nexora now features a production-grade onboarding system that guides new organizations from zero to fully operational.

## Onboarding State Model

The onboarding state is tracked per organization using the `AiOnboardingStatus` model:

```prisma
enum AiOnboardingStep {
  CONNECT_STORE
  INITIAL_SHOPIFY_SYNC
  CONNECT_PAYMENTS
  INITIAL_STRIPE_SYNC
  FIRST_BRIEF_READY
}

model AiOnboardingStatus {
  id                        String             @id @default(uuid()) @db.Uuid
  organizationId            String             @unique @db.Uuid
  currentStep               AiOnboardingStep   @default(CONNECT_STORE)
  stepsCompleted            AiOnboardingStep[]
  shopifyConnected          Boolean            @default(false)
  stripeConnected           Boolean            @default(false)
  shopifyFirstSyncCompleted Boolean            @default(false)
  stripeFirstSyncCompleted  Boolean            @default(false)
  onboardingCompleted       Boolean            @default(false)
  createdAt                 DateTime           @default(now())
  updatedAt                 DateTime           @updatedAt
}
```

## Step Completion Rules

The `AiOnboardingService` automatically detects completion of steps based on the following deterministic rules:

1.  **connect_store**: Shopify connection exists for the organization.
2.  **initial_shopify_sync**: At least one successful Shopify sync run has completed.
3.  **connect_payments**: Stripe connection exists.
4.  **initial_stripe_sync**: At least one successful Stripe sync run has completed.
5.  **first_brief_ready**: Shopify is synced, allowing for the generation of real insights.

## API Contract

### GET `/intelligence/onboarding-status`
Returns the current onboarding status for the organization.

### POST `/intelligence/onboarding/refresh`
Triggers a fresh detection of all onboarding steps and updates the status.

### POST `/intelligence/onboarding/complete-step`
Manually marks a step as completed (used primarily for steps that cannot be fully automated or for overrides).

## UI Flow

1.  **Dashboard**: If onboarding is not completed, an `OnboardingProgressCard` is displayed at the top of the executive command center.
2.  **Guided Steps**: Each step is represented by an `OnboardingStepCard` showing status (completed, in progress, pending, or locked).
3.  **Contextual Actions**: Each card provides a direct link to the relevant platform section (e.g., Stores, Data Status) to complete the required action.
4.  **Completion**: Once all steps are completed, the onboarding card is hidden, and the full power of Nexora's AI insights is unlocked.

## UX Principles

- **Simplicity**: No technical jargon. Focus on business value (e.g., "Connect Store" vs "Configure API Webhooks").
- **Trust**: Explain why each step is necessary and what the system is doing (e.g., "We are importing your products and orders").
- **Progressive Disclosure**: Only show the next relevant steps; lock future steps to prevent overwhelming the user.
