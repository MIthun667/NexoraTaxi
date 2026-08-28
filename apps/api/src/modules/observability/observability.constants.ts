export const ObservabilityDefaults = {
  metricsWindowHours: 24,
  connectorFailureWindowHours: 24,
  alertThresholds: {
    connectorFailuresWarning: 3,
    connectorFailuresCritical: 8,
    agentFailuresWarningRate: 0.2,
    agentFailuresCriticalRate: 0.4,
  },
  maxAlertsPerQuery: 100,
} as const;
