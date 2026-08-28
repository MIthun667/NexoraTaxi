export const CanonicalApprovalStatus = {
  pending: 'PENDING',
  required: 'REQUIRED',
  approved: 'APPROVED',
  rejected: 'REJECTED',
  notRequired: 'NOT_REQUIRED',
} as const;

export const CanonicalExecutionStatus = {
  pending: 'PENDING',
  pendingApproval: 'PENDING_APPROVAL',
  running: 'RUNNING',
  succeeded: 'SUCCEEDED',
  failed: 'FAILED',
  blocked: 'BLOCKED',
  cancelled: 'CANCELLED',
  unknown: 'UNKNOWN',
} as const;
