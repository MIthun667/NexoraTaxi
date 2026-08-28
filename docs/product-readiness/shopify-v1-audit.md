# Shopify-First V1 Product Readiness Audit

## Current Architecture Summary

Nexora is currently a broad "AI Company OS" monorepo with a strong commerce-intelligence slice embedded inside a much wider platform.

### Backend shape

- App composition is centralized in `apps/api/src/app.module.ts`.
- The current backend includes both commerce-relevant modules and large non-commerce platform domains:
  - Commerce-relevant:
    - `apps/api/src/modules/integrations/shopify`
    - `apps/api/src/modules/integrations/stripe`
    - `apps/api/src/modules/crm`
    - `apps/api/src/modules/intelligence`
    - `apps/api/src/modules/agents`
    - `apps/api/src/modules/approvals`
    - `apps/api/src/modules/audit`
    - `apps/api/src/modules/notifications`
    - `apps/api/src/modules/observability`
    - `apps/api/src/modules/reports`
    - `apps/api/src/modules/auth`
    - `apps/api/src/modules/authz`
    - `apps/api/src/modules/tenancy`
  - Broad platform / outside Shopify-first launch boundary:
    - `apps/api/src/modules/workforce`
    - `apps/api/src/modules/assets`
    - `apps/api/src/modules/operations`
    - `apps/api/src/modules/dispatch`
    - `apps/api/src/modules/drivers`
    - `apps/api/src/modules/fleet`
    - `apps/api/src/modules/scheduling`
    - `apps/api/src/modules/workflows`
    - `apps/api/src/modules/assignments`
    - `apps/api/src/modules/incidents`
    - `apps/api/src/modules/people`
    - `apps/api/src/modules/platform/*`

### Frontend shape

- The main app shell and sidebar are in `apps/web/src/components/layout/app-shell.tsx` and `apps/web/src/lib/navigation.ts`.
- The web app already has a credible commerce surface under:
  - `/shopify`
  - `/shopify/onboarding`
  - `/shopify/customers`
  - `/shopify/reports`
  - `/shopify/proposals`
- The app still exposes many off-scope platform routes in primary navigation:
  - `/dashboard`
  - `/executive`
  - `/command-center`
  - `/ai/*`
  - `/workforce`
  - `/assets`
  - `/operations/*`
  - `/approvals`
  - `/workflows`
  - `/settings/*`

### Data model shape

The Prisma schema already contains the core ingredients for a Shopify-first Commerce Intelligence OS:

- Store + commerce ingestion:
  - `IntegrationShopifyStore`
  - `ShopifyOrder`
  - `ShopifyProduct`
  - `ShopifyCustomer`
  - `ShopifySyncRun`
  - `ShopifyWebhookDelivery`
  - `ShopifySyncCursor`
- Finance linkage:
  - `IntegrationStripeAccount`
  - `StripeCharge`
  - `StripePaymentEvent`
  - `StripeSyncRun`
- Customer intelligence:
  - `CrmCustomerProfile`
  - `CrmCustomerSegmentSnapshot`
- Intelligence layer:
  - `AiSignal`
  - `AiInsight`
  - `AiDailySummary`
  - `AiRecommendation`
  - `AiExecutiveSummary`
  - `AiWeeklyDigest`
  - `AiNotification`
  - `ActionProposal`
  - `ActionProposalReview`
- Governance and trust:
  - `AuditLog`
  - `ApprovalRequest`
  - `ApprovalStep`
  - `ApprovalDecision`
  - `ConnectorSyncJob`
  - `ConnectorActionLog`
  - `HealthCheckLog`
  - `SystemAlert`

This means the repo already has enough schema depth for a productized V1, but the current product surface is too broad and mixes commerce with unrelated operational domains.

## V1 Product Boundary

### Recommended V1 product definition

**Nexora Commerce Intelligence OS**

A Shopify-first SaaS product for operators and executives who need:

- connected store visibility
- sync health and data trust
- executive briefings
- signals and recommendations
- action proposals with review and auditability
- customer and finance intelligence

### In-boundary V1 capabilities

- Shopify store connection, OAuth callback, sync, incremental sync, webhook handling
- Stripe connection and finance summaries
- Customer profiles and CRM segmentation derived from commerce data
- AI overview, signals, insights, executive summaries, daily summaries, weekly digests
- Recommendations and action proposals
- Auditability, approvals, notifications, and status/freshness surfaces
- Basic multi-tenant SaaS organization and RBAC support

### Out-of-boundary for V1 launch

- Workforce management
- Assets / fleet / drivers / dispatch / operations scheduling
- Broad AI agent-run administration as a primary product surface
- Generic enterprise platform administration beyond settings/access/audit needed for V1
- Knowledge graph as a visible product concept
- Reports unrelated to commerce or executive intelligence

## Keep / Refactor / Hide / Remove Matrix

| Area | Status | Notes |
| --- | --- | --- |
| `apps/api/src/modules/integrations/shopify` | Keep | Core V1 integration foundation. OAuth, sync, webhooks, and protected-data handling already exist. |
| `apps/api/src/modules/integrations/stripe` | Keep | Important V1 finance-enrichment surface. |
| `apps/api/src/modules/crm` | Keep | Needed for Customer Intelligence and segment summaries. |
| `apps/api/src/modules/intelligence` | Keep + Refactor | Strong V1 backbone, but route naming and presentation need product cleanup. |
| `apps/api/src/modules/approvals` | Keep + Refactor | Valuable for Action Proposal review and control surfaces. |
| `apps/api/src/modules/audit` | Keep | Launch-worthy trust and explainability backbone. |
| `apps/api/src/modules/notifications` | Keep | Useful for operator attention and alerts. |
| `apps/api/src/modules/observability` | Keep + Refactor | Required for sync health and trust layer, but current naming is platform-centric. |
| `apps/api/src/modules/reports` | Refactor | Weekly digest and executive outputs are relevant; generic report framing is too broad. |
| `apps/api/src/modules/agents` | Refactor + Hide from primary nav | Backend runtime is reusable; raw agent run UX is too internal for V1 primary navigation. |
| `apps/api/src/modules/auth`, `authz`, `tenancy` | Keep | Required SaaS infrastructure. |
| `apps/web/src/modules/shopify/*` | Keep + Refactor | Best existing V1 frontend base. |
| `apps/web/src/app/(app)/shopify/*` | Keep + Expand | Should become the primary product surface. |
| `apps/web/src/app/(app)/dashboard` | Refactor | Could become V1 Overview if narrowed to commerce. |
| `apps/web/src/app/(app)/executive` | Refactor | Useful as Executive Brief / Briefing surface if renamed and simplified. |
| `apps/web/src/app/(app)/ai/*` | Hide or fold into commerce IA | Useful concepts, but current route group reads as internal AI admin. |
| `apps/web/src/app/(app)/approvals` | Keep + Reposition | Relevant for proposals and operational controls, but not as a separate broad module in nav. |
| `apps/web/src/app/(app)/settings/*` | Keep + Narrow | Needed for organizations, users, roles, permissions. |
| Workforce / Assets / Operations frontend routes | Hide from primary nav | Preserve code, remove from launch-facing product IA. |
| Knowledge graph / triggers / generic governance surfacing | Hide | Reusable internally, not part of V1 product story. |

## Backend Module Launch Priority

### P0 launch-critical

- `apps/api/src/modules/integrations/shopify`
- `apps/api/src/modules/integrations/stripe`
- `apps/api/src/modules/crm`
- `apps/api/src/modules/intelligence`
- `apps/api/src/modules/auth`
- `apps/api/src/modules/authz`
- `apps/api/src/modules/tenancy`
- `apps/api/src/modules/audit`
- `apps/api/src/modules/notifications`
- `apps/api/src/modules/observability`

### P1 important for V1 control and trust

- `apps/api/src/modules/approvals`
- `apps/api/src/modules/reports`
- `apps/api/src/modules/agents`
- `apps/api/src/modules/governance`

### P2 reusable but outside launch boundary

- `workforce`, `assets`, `operations`, `dispatch`, `drivers`, `fleet`, `scheduling`, `workflows`, `assignments`, `incidents`, `people`, `platform/*`, `knowledge-graph`, `triggers`

## Frontend Route Launch Priority

### P0 launch-critical routes

- `/shopify`
- `/shopify/onboarding`
- `/shopify/customers`
- `/shopify/reports`
- `/shopify/proposals`
- `/settings/organizations`
- `/settings/users`
- `/settings/roles`
- `/settings/permissions`

### P1 likely needed after IA refactor

- `/dashboard` as V1 Overview or redirect target
- `/executive` as Executive Brief
- `/approvals` if it becomes a proposal-review / audit control surface

### P2 hide from primary launch navigation

- `/command-center`
- `/ai/*`
- `/workforce`
- `/assets/*`
- `/operations/*`
- `/dispatch/*`
- `/employees`, `/departments`, `/positions`, `/operators`
- `/workflows`

## Integration Readiness Assessment

### Shopify

**Implemented**

- OAuth install URL generation in `shopify.service.ts` + `shopify-auth.service.ts`
- OAuth callback handling in `shopify.controller.ts`
- Access-token encryption via `shopify-crypto.service.ts`
- Store upsert / activation tracking in `IntegrationShopifyStore`
- Sync endpoints in `shopify-sync.controller.ts`
- Incremental sync service
- Webhook validation and registration services
- Protected customer-data-safe fallback behavior in `shopify.service.ts`
- Onboarding and connection status UI in `apps/web/src/modules/shopify/components/*`

**Missing / needs hardening**

- Dedicated Connected Stores / Integration Status product page
- Stronger sync health / freshness presentation across all commerce pages
- More explicit production-oriented reconnect / degraded-state UX
- Stable production tunnel / app-host assumptions beyond temporary dev quick tunnels
- Clearer boundary between "connected", "limited access", "partial sync", and "intelligence ready"

**Assessment**

- **V1 viability:** high
- **Production readiness today:** medium

### Stripe

**Implemented**

- Connection, status, sync, finance summary routes in `stripe.controller.ts`
- Stripe account and event persistence in schema
- Commerce UI status cards and finance overview widgets

**Missing / needs hardening**

- A dedicated Finance Intelligence route instead of embedding finance mostly inside `/shopify`
- Clear coverage messaging so operators understand this is commerce finance support, not full accounting
- Stronger sync health and failure-state surfacing

**Assessment**

- **V1 viability:** medium-high
- **Production readiness today:** medium

### CRM / Customer Intelligence

**Implemented**

- Customer listing, high-value customers, at-risk customers, segments, profile rebuild
- Persisted profile and segment snapshot models
- Frontend customer intelligence card and customer screen foundations

**Missing / needs hardening**

- Dedicated customer-intelligence IA with stronger fallback states
- Coverage messaging when protected customer data limits or Shopify approvals restrict imports

**Assessment**

- **V1 viability:** high if positioned carefully
- **Production readiness today:** medium

## AI Readiness Assessment

### Launch-worthy AI surfaces

- `GET /ai/overview`
- `GET /ai/signals`
- `GET /ai/insights`
- `GET /ai/summary/today`
- `GET /ai/executive-summary/today`
- `GET /ai/recommendations`
- `GET /ai/action-proposals`
- `GET /ai/reports/weekly/current`
- `GET /ai/reports/weekly/history`

These are grounded by persisted intelligence entities in Prisma and are already being rendered in the commerce UI.

### Safe enough to expose in V1

- Executive Brief / daily summary
- Signals
- Insights
- Recommendations
- Action Proposals
- Weekly digests
- Notifications

### Surfaces that read as too internal for primary V1 UX

- raw agent definitions
- raw agent runs
- run observations / decision traces as top-level navigation
- governance metrics / AI observability as a primary product pillar

These are better treated as secondary trust/admin tooling rather than first-run product navigation.

### Key AI caveats

- Some current intelligence outputs are generated on-demand and may return `RESOURCE_NOT_FOUND` before generation.
- Confidence and evidence framing need product hardening.
- The system must distinguish clearly between missing data, limited Shopify approval scope, and a genuinely low-risk business state.

## Workflows / Approvals / Audit Launch-Worthy Assessment

### Already strong enough to keep in V1

- Audit log persistence via `apps/api/src/modules/audit/audit.service.ts`
- Approval queue and step actions in `apps/api/src/modules/approvals/approvals.controller.ts`
- Action proposal review flow in `apps/api/src/modules/intelligence/ai.controller.ts`
- Request-context-linked audit records and request IDs

### Needs product cleanup

- Approval UX is currently generic and not clearly positioned as a bounded Action Proposal review control surface.
- Auditability exists in backend behavior but is not yet shaped into a polished explainability surface.

**Assessment**

- **Launch-worthy as infrastructure:** yes
- **Launch-worthy as user-facing experience:** needs refactor

## Recommended V1 Information Architecture

### Primary navigation recommendation

- Overview
- Executive Brief
- Store Performance
- Signals
- Recommendations
- Action Proposals
- Catalog Intelligence
- Customer Intelligence
- Finance Intelligence
- Connected Stores
- Sync Health
- Settings

### Secondary / utility surfaces

- Access & Roles
- Audit & Explainability
- Notification center

### Hidden from primary navigation for V1

- Workforce
- Assets
- Operations
- Dispatch
- Workflows
- Generic AI Command Center
- Agent Runs
- Policy Violations
- AI Metrics
- Observability as a top-level product category

## Risks Blocking Launch

### High risk

1. Product boundary confusion
   - The current nav and route structure still markets the app as a broad internal platform rather than a focused commerce SaaS.
2. Integration trust signaling is incomplete
   - Connection state exists, but global sync freshness, partial coverage, and degraded-state language need hardening.
3. AI surface clarity
   - Recommendations, signals, summaries, and proposals are promising, but evidence visibility and confidence framing need product-grade cleanup.
4. Route and naming duplication
   - `/dashboard`, `/executive`, `/command-center`, `/ai/*`, and `/shopify/*` split the story across too many top-level concepts.

### Medium risk

5. Generic admin and platform surfaces dominate perceived scope
6. Agent runtime UX feels internal and may reduce buyer trust if exposed too early
7. Finance and customer intelligence are embedded in commerce pages but not clearly packaged as standalone product capabilities
8. Current dev-oriented integration flow still relies on manual tunnel handling for local testing

### Known engineering risk

9. Prisma migration history was recently misordered for clean deploys and has now been corrected locally, but rollout discipline should be verified before release processes are trusted.

## Recommended 60-Day Productization Sequence

### Days 1-7

- Finalize Shopify-first V1 product boundary
- Remove off-scope modules from primary navigation
- Reframe route titles, labels, and product naming
- Document launch information architecture

### Days 8-14

- Harden Overview and Executive Brief
- Separate Recommendations vs Action Proposals cleanly
- Create Connected Stores and Sync Health product surfaces

### Days 15-25

- Productize Signals
- Productize Customer Intelligence
- Productize Finance Intelligence
- Add trust / freshness / coverage layer across key screens

### Days 26-35

- Tighten onboarding flow and reconnect states
- Clarify permission-based affordances
- Improve empty states, loading states, and degraded states

### Days 36-45

- Standardize backend V1 route contracts
- Remove or de-emphasize legacy / duplicated APIs
- Consolidate frontend query-state patterns and error handling

### Days 46-55

- Improve auditability and explainability surfaces
- Polish proposal review UX
- Package reports, executive briefs, and sync history into trustworthy operator workflows

### Days 56-60

- Launch-readiness checklist
- Technical debt register
- README / positioning rewrite
- Final enterprise design polish pass

## Bottom Line

This repo is already closer to a sellable Shopify-first SaaS than a typical prototype because the core integration, intelligence, persistence, and governance layers are real. The primary blocker is not missing foundations; it is **product focus**. Nexora should launch by narrowing the visible surface to commerce intelligence, integration trust, executive briefing, and bounded decision support while hiding the much larger platform operating system behind the scenes.
