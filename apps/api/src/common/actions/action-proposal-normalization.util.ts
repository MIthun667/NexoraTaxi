import { CanonicalActionProposal } from './action-proposal.interface';
import {
  ACTION_PROPOSAL_CATEGORY_MAP,
  LEGACY_ACTION_PROPOSAL_MAPPINGS,
} from './legacy-action-map';
import { ActionProposalCategory } from './action-proposal-category.constants';

export interface CanonicalActionProposalInput {
  proposalId?: string | null;
  proposalType: string;
  title?: string | null;
  summary: string;
  rationale?: string | null;
  sourceModule?: string | null;
  sourceSystem?: string | null;
  targetEntityType?: string | null;
  targetEntityId?: string | null;
  organizationId?: string | null;
  requestedAction?: string | null;
  proposedChanges?: Record<string, unknown> | null;
  riskLevel?: string | null;
  confidence?: number | null;
  approvalRequired?: boolean | null;
  approvalStatus?: string | null;
  executionStatus?: string | null;
  createdAt?: Date | null;
  metadata?: Record<string, unknown> | null;
}

export function getLegacyActionProposalMap() {
  return LEGACY_ACTION_PROPOSAL_MAPPINGS;
}

export function getActionProposalCategory(proposalType: string) {
  return ACTION_PROPOSAL_CATEGORY_MAP[proposalType] ?? ActionProposalCategory.system;
}

export function normalizeLegacyActionProposalType(proposalType: string) {
  const legacyMapping = LEGACY_ACTION_PROPOSAL_MAPPINGS.find(
    (entry) => entry.legacyAction === proposalType,
  );

  return {
    normalizedProposalType: legacyMapping?.preferredUniversalAction ?? proposalType,
    legacyProposalType: legacyMapping ? proposalType : null,
    proposalCategory: legacyMapping?.proposalCategory ?? getActionProposalCategory(proposalType),
    mapping: legacyMapping ?? null,
  };
}

export function buildActionProposal(
  input: CanonicalActionProposalInput,
): CanonicalActionProposal {
  const normalized = normalizeLegacyActionProposalType(input.proposalType);

  return {
    proposalId: input.proposalId ?? null,
    proposalType: input.proposalType,
    proposalCategory: normalized.proposalCategory,
    title: input.title ?? input.summary,
    summary: input.summary,
    rationale: input.rationale ?? null,
    sourceModule: input.sourceModule ?? null,
    sourceSystem: input.sourceSystem ?? null,
    targetEntityType: input.targetEntityType ?? null,
    targetEntityId: input.targetEntityId ?? null,
    organizationId: input.organizationId ?? null,
    requestedAction: input.requestedAction ?? input.proposalType,
    proposedChanges: input.proposedChanges ?? null,
    riskLevel: input.riskLevel ?? null,
    confidence: input.confidence ?? null,
    approvalRequired: input.approvalRequired ?? null,
    approvalStatus: input.approvalStatus ?? null,
    executionStatus: input.executionStatus ?? null,
    createdAt: input.createdAt ?? null,
    metadata: {
      ...(input.metadata ?? {}),
      canonicalProposalType: normalized.normalizedProposalType,
      legacyProposalType: normalized.legacyProposalType,
    },
  };
}
