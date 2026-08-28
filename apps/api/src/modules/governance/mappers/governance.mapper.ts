import { AgentHealthStatus, AgentRunMetrics } from '../governance.types';
import { AgentRunGovernancePresenter } from '../presenters/agent-run-governance.presenter';

export function toAgentRunGovernancePresenter(
  metrics: AgentRunMetrics,
  health: AgentHealthStatus,
): AgentRunGovernancePresenter {
  return { metrics, health };
}
