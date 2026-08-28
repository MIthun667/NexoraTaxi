export interface CanonicalActionProposal {
  proposalId?: string | null;
  proposalType: string;
  proposalCategory: string;
  title: string;
  summary: string;
  rationale?: string | null;
  sourceModule?: string | null;
  sourceSystem?: string | null;
  targetEntityType?: string | null;
  targetEntityId?: string | null;
  organizationId?: string | null;
  requestedAction: string;
  proposedChanges?: Record<string, unknown> | null;
  riskLevel?: string | null;
  confidence?: number | null;
  approvalRequired?: boolean | null;
  approvalStatus?: string | null;
  executionStatus?: string | null;
  createdAt?: Date | null;
  metadata?: Record<string, unknown> | null;
}
