/**
 * Beta Configuration
 * Set BETA_ENABLED to false to completely disable the beta system
 */

export const BETA_CONFIG = {
  // Master switch - set to false to disable all beta features
  BETA_ENABLED: true,
  
  // Admin email - this account will have full admin access
  // IMPORTANT: Change this to YOUR email before deploying!
  
  // Beta expiration date (optional)
  BETA_END_DATE: null as string | null, // e.g., '2025-03-01'
  
  // Maximum number of beta testers
  MAX_TESTERS: 15,
  
  // Invitation expiration days
  INVITATION_EXPIRY_DAYS: 7,
  
  // Storage limits
  MAX_IMAGE_SIZE_MB: 10,
  IMAGE_COMPRESSION_QUALITY: 0.85,
  
  // Feature flags
  FEATURES: {
    CLOUD_STORAGE: true,
    USAGE_METRICS: true,
    FEEDBACK_WIDGET: true,
  },
} as const;

export type BetaRole = 'admin' | 'tester';
export type InvitationStatus = 'pending' | 'accepted' | 'expired';
export type PaymentPreference = 'one_time' | 'subscription' | 'undecided';
