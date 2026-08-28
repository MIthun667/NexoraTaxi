# Shopify-First V1 Navigation Map

## Objective

Refactor Nexora's primary product surface so the application reads as a focused Shopify-first Commerce Intelligence OS rather than a broad internal AI operations platform.

## Final Navigation Tree

### Core navigation

- `Overview` -> `/shopify/overview`
- `Executive Brief` -> `/shopify/executive-brief`
- `Store Performance` -> `/shopify/store-performance`
- `Signals` -> `/shopify/signals`
- `Recommendations` -> `/shopify/recommendations`
- `Action Proposals` -> `/shopify/action-proposals`

### Intelligence layers

- `Catalog Intelligence` -> `/shopify/catalog-intelligence`
- `Customer Intelligence` -> `/shopify/customer-intelligence`
- `Finance Intelligence` -> `/shopify/finance-intelligence`

### Integration and trust

- `Connected Stores` -> `/shopify/connected-stores`
- `Sync Health` -> `/shopify/sync-health`

### System

- `Settings` -> `/settings`
- `Access & Roles` -> `/settings/access`
- `Audit & Activity` -> `/settings/audit-activity`

## Old to New Route Mapping

| Old route | New route | Notes |
| --- | --- | --- |
| `/` | `/shopify/overview` | Root now lands in the V1 commerce surface. |
| `/dashboard` | `/shopify/overview` | Broad operational dashboard repositioned as product overview entry point. |
| `/executive` | `/shopify/executive-brief` | Executive landing narrowed to a commerce briefing surface. |
| `/command-center` | `/shopify/store-performance` | Generic command-center framing removed from the product narrative. |
| `/shopify` | `/shopify/overview` | Shopify namespace becomes the product namespace. |
| `/shopify/reports` | `/shopify/executive-brief` | Reports reframed as the Executive Brief surface. |
| `/shopify/proposals` | `/shopify/action-proposals` | Proposal route renamed for product clarity. |
| `/shopify/customers` | `/shopify/customer-intelligence` | Customer view reframed as an intelligence surface. |

## What Was Consolidated

- `Dashboard`, `Executive`, and `Command Center` no longer compete as separate top-level concepts.
- The `/shopify` route family now owns the primary product story and acts as the canonical V1 namespace.
- Existing Shopify screens were repositioned into clearer executive-facing product labels:
  - reports -> executive brief
  - proposals -> action proposals
  - customers -> customer intelligence
- Top-bar breadcrumbs now resolve against the V1 navigation tree instead of legacy platform sections.

## Hidden from Primary Navigation

These routes remain in the codebase for compatibility and future expansion, but they were removed from the primary product surface because they dilute the V1 Shopify-first story:

- `/ai/*`
- `/approvals`
- `/assets/*`
- `/dispatch/*`
- `/operations/*`
- `/workforce`
- `/workflows`
- `/employees`
- `/departments`
- `/positions`
- `/operators`
- raw settings subroutes not required for the primary V1 story

## Why These Areas Were Hidden

- Workforce, assets, dispatch, and operations are valuable platform capabilities but outside the V1 Commerce Intelligence launch boundary.
- Raw AI administration surfaces such as agent runs and AI control pages feel internal and experimental when exposed directly to operators.
- Generic operational dashboards and command centers create overlapping entry points and weaken product clarity.
- The primary nav now emphasizes executive decision support, intelligence, integration trust, and controlled actions.

## Permission Model Notes

- Navigation visibility is now filtered through `requiredPermissions` in `apps/web/src/lib/navigation.ts`.
- Sidebar rendering respects the authenticated user's RBAC capabilities through `useAuth().hasPermission(...)`.
- Product-admin areas remain visible only when the user has the relevant organization, role, permission, or approval-read access.

## Future Expansion

The broader AI Company OS vision is preserved through hidden route families and reusable backend modules. Future expansion can reintroduce additional product suites without disturbing the Shopify-first V1 information architecture.

Candidate future suites:

- workforce operations
- assets and maintenance
- dispatch and field operations
- deeper AI governance and runtime administration
- broader enterprise workflow orchestration

## Files Updated

- `apps/web/src/lib/navigation.ts`
- `apps/web/src/components/layout/sidebar-nav.tsx`
- `apps/web/src/components/layout/top-navbar.tsx`
- `apps/web/src/app/page.tsx`
- `apps/web/src/app/(app)/dashboard/page.tsx`
- `apps/web/src/app/(app)/executive/page.tsx`
- `apps/web/src/app/(app)/command-center/page.tsx`
- `apps/web/src/app/(app)/shopify/page.tsx`
- `apps/web/src/app/(app)/shopify/reports/page.tsx`
- `apps/web/src/app/(app)/shopify/proposals/page.tsx`
- `apps/web/src/app/(app)/shopify/customers/page.tsx`
- `apps/web/src/app/(app)/shopify/overview/page.tsx`
- `apps/web/src/app/(app)/shopify/executive-brief/page.tsx`
- `apps/web/src/app/(app)/shopify/store-performance/page.tsx`
- `apps/web/src/app/(app)/shopify/signals/page.tsx`
- `apps/web/src/app/(app)/shopify/recommendations/page.tsx`
- `apps/web/src/app/(app)/shopify/action-proposals/page.tsx`
- `apps/web/src/app/(app)/shopify/catalog-intelligence/page.tsx`
- `apps/web/src/app/(app)/shopify/customer-intelligence/page.tsx`
- `apps/web/src/app/(app)/shopify/finance-intelligence/page.tsx`
- `apps/web/src/app/(app)/shopify/connected-stores/page.tsx`
- `apps/web/src/app/(app)/shopify/sync-health/page.tsx`
- `apps/web/src/app/(app)/settings/page.tsx`
- `apps/web/src/app/(app)/settings/access/page.tsx`
- `apps/web/src/app/(app)/settings/audit-activity/page.tsx`

