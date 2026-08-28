import { AgentHealthStatus, AgentRunMetrics } from '../governance.types';

export interface AgentRunGovernancePresenter {
  metrics: AgentRunMetrics;
  health: AgentHealthStatus;
}
