import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BETA_CONFIG } from '../config';
import type { BetaUser } from './useBetaAuth';
import type { Json } from '@/integrations/supabase/types';

const generateSessionId = () => {
  const stored = sessionStorage.getItem('beta_session_id');
  if (stored) return stored;
  
  const newId = `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  sessionStorage.setItem('beta_session_id', newId);
  return newId;
};

// Heartbeat interval in milliseconds (1 minute)
const HEARTBEAT_INTERVAL = 60 * 1000;

interface UseUsageMetricsReturn {
  trackEvent: (eventType: string, eventData?: Record<string, Json>) => void;
  trackPageView: (pagePath: string) => void;
}

export function useUsageMetrics(betaUser: BetaUser | null): UseUsageMetricsReturn {
  const sessionId = useRef(generateSessionId());
  const lastPageView = useRef<string | null>(null);
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);

  const trackEvent = useCallback(async (
    eventType: string, 
    eventData: Record<string, Json> = {}
  ) => {
    if (!BETA_CONFIG.FEATURES.USAGE_METRICS || !betaUser) return;

    try {
      await supabase.from('usage_metrics').insert([{
        user_id: betaUser.id,
        session_id: sessionId.current,
        event_type: eventType,
        event_data: eventData as Json,
        page_path: window.location.pathname,
      }]);
    } catch (err) {
      console.error('Error tracking event:', err);
    }
  }, [betaUser]);

  const trackPageView = useCallback((pagePath: string) => {
    if (pagePath === lastPageView.current) return;
    lastPageView.current = pagePath;
    trackEvent('page_view', { path: pagePath });
  }, [trackEvent]);

  // Track session start and set up heartbeat for session time tracking
  useEffect(() => {
    if (!betaUser) return;

    trackEvent('session_start');

    // Set up heartbeat to track active session time
    // Each heartbeat represents 1 minute of active usage
    heartbeatInterval.current = setInterval(() => {
      // Only send heartbeat if document is visible (user is actively using the app)
      if (document.visibilityState === 'visible') {
        trackEvent('session_heartbeat');
      }
    }, HEARTBEAT_INTERVAL);

    // Cleanup on unmount or user change
    return () => {
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
        heartbeatInterval.current = null;
      }
    };
  }, [betaUser, trackEvent]);

  // Handle visibility changes - pause/resume heartbeat
  useEffect(() => {
    if (!betaUser) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // User switched away from the app
        trackEvent('session_pause');
      } else {
        // User came back to the app
        trackEvent('session_resume');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [betaUser, trackEvent]);

  return { trackEvent, trackPageView };
}

// Pre-defined event types for consistency
export const METRIC_EVENTS = {
  // Navigation
  PAGE_VIEW: 'page_view',
  SESSION_START: 'session_start',
  SESSION_END: 'session_end',
  SESSION_HEARTBEAT: 'session_heartbeat',
  SESSION_PAUSE: 'session_pause',
  SESSION_RESUME: 'session_resume',
  
  // Objects
  OBJECT_CREATED: 'object_created',
  OBJECT_VIEWED: 'object_viewed',
  OBJECT_DELETED: 'object_deleted',
  
  // Projects
  PROJECT_CREATED: 'project_created',
  PROJECT_VIEWED: 'project_viewed',
  PROJECT_DELETED: 'project_deleted',
  
  // Sessions
  SESSION_ADDED: 'session_added',
  SESSION_EDITED: 'session_edited',
  
  // Features
  IMPORT_JSON: 'import_json',
  EXPORT_JSON: 'export_json',
  EXPORT_PDF: 'export_pdf',
  FITS_ANALYZED: 'fits_analyzed',
  PHD2_ANALYZED: 'phd2_analyzed',
  
  // Storage
  IMAGE_UPLOADED: 'image_uploaded',
  DATA_SYNCED: 'data_synced',
  
  // Feedback
  FEEDBACK_OPENED: 'feedback_opened',
  FEEDBACK_SUBMITTED: 'feedback_submitted',
} as const;
