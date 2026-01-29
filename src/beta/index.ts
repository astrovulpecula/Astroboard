// Beta System Exports
// This file provides the main entry point for the beta system.
// To remove beta functionality, delete this folder and remove the BetaGate wrapper from App.tsx

export { BETA_CONFIG } from './config';
export type { BetaRole, InvitationStatus, PaymentPreference } from './config';

export { BetaGate, useBetaAuth, useUsageMetrics } from './components/BetaGate';
export type { BetaUser } from './hooks/useBetaAuth';

export { useCloudStorage } from './hooks/useCloudStorage';
export { METRIC_EVENTS } from './hooks/useUsageMetrics';
