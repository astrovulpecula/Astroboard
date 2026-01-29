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

interface UseUsageMetricsReturn {
  trackEvent: (eventType: string, eventData?: Record<string, Json>) => void;
  trackPageView: (pagePath: string) => void;
}

export function useUsageMetrics(betaUser: BetaUser | null): UseUsageMetricsReturn {
  const sessionId = useRef(generateSessionId());
  const lastPageView = useRef<string | null>(null);

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

  // Track session start
  useEffect(() => {
    if (betaUser) {
      trackEvent('session_start');
    }
  }, [betaUser, trackEvent]);

  return { trackEvent, trackPageView };
}

// Pre-defined event types for consistency
export const METRIC_EVENTS = {
  // Navigation
  PAGE_VIEW: 'page_view',
  SESSION_START: 'session_start',
  SESSION_END: 'session_end',
  
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
