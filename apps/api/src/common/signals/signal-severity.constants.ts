export const SignalSeverity = {
  low: 'LOW',
  medium: 'MEDIUM',
  high: 'HIGH',
  critical: 'CRITICAL',
} as const;

export type SignalSeverityValue =
  (typeof SignalSeverity)[keyof typeof SignalSeverity];
