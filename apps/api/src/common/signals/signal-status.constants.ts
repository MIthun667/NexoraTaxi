export const SignalStatus = {
  informational: 'INFORMATIONAL',
  open: 'OPEN',
  acknowledged: 'ACKNOWLEDGED',
  resolved: 'RESOLVED',
} as const;

export type SignalStatusValue =
  (typeof SignalStatus)[keyof typeof SignalStatus];
