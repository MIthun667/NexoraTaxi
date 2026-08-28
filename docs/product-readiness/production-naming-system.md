# Production Naming System

## Naming Principles

- Lead with the product brand: `Nexora Commerce`
- Prefer short, commercial labels over technical or architectural language
- Use language an executive, operator, or store owner can scan quickly
- Favor concrete nouns and verbs: `Overview`, `Signals`, `Stores`, `Actions`
- Keep Shopify visible only where connection context matters
- Avoid framework, migration, or internal platform wording in the primary UI

## Navigation Naming System

### Product brand

- Primary brand: `Nexora Commerce`
- Optional support line: `Performance, signals, and store insights`

### Primary navigation

- `Overview`
- `Daily Brief`
- `Performance`
- `Signals`
- `Opportunities`
- `Actions`
- `Catalog`
- `Customers`
- `Payments`
- `Stores`
- `Data Status`
- `Settings`

### System pages

- `Access & Roles`
- `Audit & Activity`

## Page Title Naming System

- Summary surfaces use concise, executive-friendly titles:
  - `Overview`
  - `Daily Brief`
  - `Performance`
  - `Signals`
- Intelligence surfaces use business nouns, not architecture nouns:
  - `Catalog`
  - `Customers`
  - `Payments`
- Integration surfaces use trust-oriented labels:
  - `Stores`
  - `Data Status`
- Administrative surfaces stay product-aware:
  - `Workspace Settings`
  - `Access and Roles`
  - `Audit and Activity`

## Old Label to New Label Mapping

| Old label | New label |
| --- | --- |
| Shopify-first V1 | Removed from UI |
| Commerce Intelligence OS | Nexora Commerce |
| Executive Brief | Daily Brief |
| Store Performance | Performance |
| Recommendations | Opportunities |
| Action Proposals | Actions |
| Intelligence Layers | Removed from UI |
| Catalog Intelligence | Catalog |
| Customer Intelligence | Customers |
| Finance Intelligence | Payments |
| Connected Stores | Stores |
| Sync Health | Data Status |
| Connection Status | Store Connection |
| Snapshot | Today’s Summary |
| Refresh brief | Refresh Summary |
| Refreshing brief... | Refreshing summary... |
| Refresh recommendations | Refresh Opportunities |
| Review proposals | Review actions |
| Create proposal | Create action |
| No commands yet. | No opportunities available right now. |
| No proposals yet. | No actions are waiting right now. |
| Search operations, entities, or incidents | Search stores, products, customers, or signals |

## Reserved Words To Avoid In Primary UI

- `OS`
- `platform`
- `intelligence layer`
- `command center`
- `agent runs`
- `operations hub`
- `Shopify-first V1`
- `internal`
- `proposal` when the user-facing concept is simply an action awaiting review
- `tenant` when `organization` is clearer

## Notes

- `Shopify` remains visible where it is operationally important:
  - store connection
  - OAuth setup
  - data sync actions
- `Actions` is the preferred customer-facing term for bounded, reviewable proposals.
- `Opportunities` is the preferred customer-facing term for advisory recommendations.
