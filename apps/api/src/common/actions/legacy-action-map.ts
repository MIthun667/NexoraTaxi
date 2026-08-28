import { ActionProposalCategory } from './action-proposal-category.constants';

export interface LegacyActionProposalMapping {
  legacyAction: string;
  preferredUniversalAction: string;
  proposalCategory: string;
  notes: string;
  externallyExposed: boolean;
}

export const LEGACY_ACTION_PROPOSAL_MAPPINGS: LegacyActionProposalMapping[] = [
  {
    legacyAction: 'DRIVER_COMPLIANCE_REVIEW',
    preferredUniversalAction: 'PEOPLE_COMPLIANCE_REVIEW',
    proposalCategory: ActionProposalCategory.people,
    notes: 'Legacy driver compliance actions should converge on universal people/workforce language.',
    externallyExposed: false,
  },
  {
    legacyAction: 'SUSPEND_DRIVER',
    preferredUniversalAction: 'SUSPEND_PERSON',
    proposalCategory: ActionProposalCategory.people,
    notes: 'Driver-specific suspension proposals should converge on a role-neutral people abstraction.',
    externallyExposed: false,
  },
  {
    legacyAction: 'FLEET_COMPLIANCE_REVIEW',
    preferredUniversalAction: 'ASSET_COMPLIANCE_REVIEW',
    proposalCategory: ActionProposalCategory.assets,
    notes: 'Fleet compliance proposals should converge on universal asset language.',
    externallyExposed: false,
  },
  {
    legacyAction: 'BLOCK_FLEET_VEHICLE',
    preferredUniversalAction: 'BLOCK_ASSET',
    proposalCategory: ActionProposalCategory.assets,
    notes: 'Vehicle-specific blocking should converge on universal asset operations.',
    externallyExposed: false,
  },
  {
    legacyAction: 'ESCALATE_DISPATCH_INCIDENT',
    preferredUniversalAction: 'ESCALATE_OPERATIONAL_INCIDENT',
    proposalCategory: ActionProposalCategory.operations,
    notes: 'Dispatch incident escalation should converge on universal operational incident language.',
    externallyExposed: false,
  },
  {
    legacyAction: 'CANCEL_ACTIVE_DISPATCH_RUN',
    preferredUniversalAction: 'CANCEL_OPERATIONAL_TASK',
    proposalCategory: ActionProposalCategory.operations,
    notes: 'Dispatch run cancellation should converge on universal operational task terminology.',
    externallyExposed: false,
  },
];

export const ACTION_PROPOSAL_CATEGORY_MAP: Record<string, string> = {
  CREATE_WORKFORCE_MEMBER: ActionProposalCategory.people,
  UPDATE_WORKFORCE_STATUS: ActionProposalCategory.people,
  ASSIGN_WORKFORCE_TO_SHIFT: ActionProposalCategory.people,
  DRIVER_COMPLIANCE_REVIEW: ActionProposalCategory.people,
  SUSPEND_DRIVER: ActionProposalCategory.people,
  SCHEDULE_ASSET_MAINTENANCE: ActionProposalCategory.assets,
  UPDATE_ASSET_STATUS: ActionProposalCategory.assets,
  FLEET_COMPLIANCE_REVIEW: ActionProposalCategory.assets,
  BLOCK_FLEET_VEHICLE: ActionProposalCategory.assets,
  CREATE_WORK_ORDER: ActionProposalCategory.operations,
  UPDATE_WORK_ORDER_PRIORITY: ActionProposalCategory.operations,
  CREATE_SHIFT: ActionProposalCategory.operations,
  UPDATE_SHIFT_CAPACITY: ActionProposalCategory.operations,
  ESCALATE_INCIDENT: ActionProposalCategory.operations,
  RESOLVE_INCIDENT: ActionProposalCategory.operations,
  ASSIGN_INCIDENT: ActionProposalCategory.operations,
  CREATE_ASSIGNMENT: ActionProposalCategory.operations,
  RELEASE_ASSIGNMENT: ActionProposalCategory.operations,
  ESCALATE_DISPATCH_INCIDENT: ActionProposalCategory.operations,
  CANCEL_ACTIVE_DISPATCH_RUN: ActionProposalCategory.operations,
  CREATE_WORKFLOW_TASK: ActionProposalCategory.workflows,
  ESCALATE_APPROVAL_REQUEST: ActionProposalCategory.approvals,
  SEND_NOTIFICATION: ActionProposalCategory.notifications,
  ALERT_SUPERVISOR: ActionProposalCategory.notifications,
  CONNECT_STRIPE: ActionProposalCategory.system,
  RUN_SHOPIFY_SYNC: ActionProposalCategory.system,
  CREATE_SUMMARY_REPORT: ActionProposalCategory.system,
  CREATE_RECOMMENDATION: ActionProposalCategory.system,
};
