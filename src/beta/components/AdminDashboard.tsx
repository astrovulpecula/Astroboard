import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Users,
  Mail,
  MessageSquare,
  BarChart3,
  Send,
  Loader2,
  CheckCircle,
  Clock,
  XCircle,
  Star,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  LogOut,
  Trash2,
  AlertTriangle,
  RotateCcw,
  Check,
} from 'lucide-react';
import type { BetaUser } from '../hooks/useBetaAuth';
import { BETA_CONFIG } from '../config';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface AdminDashboardProps {
  betaUser: BetaUser;
  onClose: () => void;
  onSignOut: () => void;
}

interface Invitation {
  id: string;
  email: string;
  invitation_code: string;
  status: 'pending' | 'accepted' | 'expired';
  role: 'admin' | 'tester';
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  used_by_email?: string | null;
}

interface BetaUserData {
  id: string;
  user_id: string;
  email: string;
  role: 'admin' | 'tester';
  first_login_at: string | null;
  last_login_at: string | null;
  created_at: string;
  total_session_time?: number;
  has_feedback?: boolean;
}

interface Feedback {
  id: string;
  rating: number | null;
  what_liked: string | null;
  what_to_improve: string | null;
  would_recommend: boolean | null;
  recommend_comment: string | null;
  payment_preference: 'one_time' | 'subscription' | 'undecided' | null;
  payment_comment: string | null;
  created_at: string;
  usage_frequency: string | null;
  usage_moment: string | null;
  problem_to_solve: string | null;
  found_confusing: boolean | null;
  ease_of_use: number | null;
  previous_management: string | null;
  uses_similar_app: boolean | null;
  similar_app_name: string | null;
  pay_features: string[] | null;
  pay_features_other: string | null;
  experience_level: string | null;
  beta_users: {
    email: string;
  };
}

interface MetricSummary {
  totalSessions: number;
  totalEvents: number;
  uniqueUsers: number;
  topEvents: { event_type: string; count: number }[];
}

interface AppUsageMetrics {
  totalImages: number;
  totalObjects: number;
  totalLights: number;
  totalExposureHours: number;
  topFilters: { filter: string; count: number }[];
  topConstellations: { constellation: string; count: number }[];
}

interface FeedbackStats {
  experienceLevels: Record<string, number>;
  usageFrequencies: Record<string, number>;
  usageMoments: Record<string, number>;
  previousManagements: Record<string, number>;
  usesSimilarApp: { yes: number; no: number };
  foundConfusing: { yes: number; no: number };
  easeOfUse: Record<number, number>;
  payFeatures: Record<string, number>;
  textComments: {
    problemToSolve: string[];
    whatLiked: string[];
    whatToImprove: string[];
    similarAppNames: string[];
    payFeaturesOther: string[];
    paymentComments: string[];
  };
}

export function AdminDashboard({ betaUser, onClose, onSignOut }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'invitations' | 'users' | 'feedback' | 'metrics'>('invitations');
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [users, setUsers] = useState<BetaUserData[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [feedbackStats, setFeedbackStats] = useState<FeedbackStats | null>(null);
  const [metrics, setMetrics] = useState<MetricSummary | null>(null);
  const [appUsage, setAppUsage] = useState<AppUsageMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [expandedFeedback, setExpandedFeedback] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<BetaUserData | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [invitationToDelete, setInvitationToDelete] = useState<Invitation | null>(null);
  const [deletingInvitation, setDeletingInvitation] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resettingFeedback, setResettingFeedback] = useState(false);

  const [isVerifiedAdmin, setIsVerifiedAdmin] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  useEffect(() => {
    const verifyAdminAccess = async () => {
      try {
        const { data, error } = await supabase
          .from('beta_users')
          .select('id')
          .limit(2);
        
        if (error) {
          console.error('Admin verification failed:', error);
          setVerificationError('Acceso no autorizado');
          return;
        }
        
        if (data && data.length > 0) {
          setIsVerifiedAdmin(true);
        } else {
          setVerificationError('Acceso no autorizado');
        }
      } catch (err) {
        console.error('Admin verification error:', err);
        setVerificationError('Error de verificación');
      }
    };

    verifyAdminAccess();
  }, []);

  useEffect(() => {
    if (isVerifiedAdmin) {
      loadData();
    }
  }, [activeTab, isVerifiedAdmin]);

  const loadData = async () => {
    if (!isVerifiedAdmin) return;
    
    setLoading(true);
    try {
      switch (activeTab) {
        case 'invitations':
          const { data: invData, error: invError } = await supabase
            .from('beta_invitations')
            .select('*, beta_users!beta_users_invitation_id_fkey(email)')
            .order('created_at', { ascending: false });
          if (invError) {
            console.error('Failed to load invitations:', invError.message);
            setInvitations([]);
          } else {
            const mappedInvitations = (invData || []).map((inv: any) => ({
              ...inv,
              used_by_email: inv.beta_users && inv.beta_users.length > 0 
                ? inv.beta_users[0].email 
                : null,
            }));
            setInvitations(mappedInvitations as Invitation[]);
          }
          break;
        case 'users':
          const { data: userData, error: userError } = await supabase
            .from('beta_users')
            .select('id, user_id, email, role, first_login_at, last_login_at, created_at')
            .order('created_at', { ascending: false });
          if (userError) {
            console.error('Failed to load users:', userError.message);
            setUsers([]);
          } else {
            // Fetch feedback to check which users have submitted
            const { data: feedbackData } = await supabase
              .from('beta_feedback')
              .select('user_id');
            
            const usersWithFeedback = new Set((feedbackData || []).map(f => f.user_id));
            
            const usersWithTime = await Promise.all(
              (userData || []).map(async (user: any) => {
                const { data: sessionData } = await supabase
                  .from('usage_metrics')
                  .select('event_data')
                  .eq('user_id', user.id)
                  .eq('event_type', 'session_heartbeat');
                
                const totalSeconds = (sessionData?.length || 0) * 60;
                return { 
                  ...user, 
                  total_session_time: totalSeconds,
                  has_feedback: usersWithFeedback.has(user.id)
                };
              })
            );
            setUsers(usersWithTime as BetaUserData[]);
          }
          break;
        case 'feedback':
          const { data: fbData, error: fbError } = await supabase
            .from('beta_feedback')
            .select('*, beta_users(email)')
            .order('created_at', { ascending: false });
          if (fbError) {
            console.error('Failed to load feedback:', fbError.message);
            setFeedback([]);
          } else {
            const feedbackList = (fbData as unknown as Feedback[]) || [];
            setFeedback(feedbackList);
            calculateFeedbackStats(feedbackList);
          }
          break;
        case 'metrics':
          await loadMetrics();
          break;
      }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateFeedbackStats = (feedbackList: Feedback[]) => {
    const stats: FeedbackStats = {
      experienceLevels: {},
      usageFrequencies: {},
      usageMoments: {},
      previousManagements: {},
      usesSimilarApp: { yes: 0, no: 0 },
      foundConfusing: { yes: 0, no: 0 },
      easeOfUse: {},
      payFeatures: {},
      textComments: {
        problemToSolve: [],
        whatLiked: [],
        whatToImprove: [],
        similarAppNames: [],
        payFeaturesOther: [],
        paymentComments: [],
      },
    };

    feedbackList.forEach(fb => {
      // Experience levels
      if (fb.experience_level) {
        stats.experienceLevels[fb.experience_level] = (stats.experienceLevels[fb.experience_level] || 0) + 1;
      }

      // Usage frequencies
      if (fb.usage_frequency) {
        stats.usageFrequencies[fb.usage_frequency] = (stats.usageFrequencies[fb.usage_frequency] || 0) + 1;
      }

      // Usage moments
      if (fb.usage_moment) {
        stats.usageMoments[fb.usage_moment] = (stats.usageMoments[fb.usage_moment] || 0) + 1;
      }

      // Previous management
      if (fb.previous_management) {
        stats.previousManagements[fb.previous_management] = (stats.previousManagements[fb.previous_management] || 0) + 1;
      }

      // Uses similar app
      if (fb.uses_similar_app === true) stats.usesSimilarApp.yes++;
      if (fb.uses_similar_app === false) stats.usesSimilarApp.no++;

      // Found confusing
      if (fb.found_confusing === true) stats.foundConfusing.yes++;
      if (fb.found_confusing === false) stats.foundConfusing.no++;

      // Ease of use
      if (fb.ease_of_use) {
        stats.easeOfUse[fb.ease_of_use] = (stats.easeOfUse[fb.ease_of_use] || 0) + 1;
      }

      // Pay features
      if (fb.pay_features) {
        fb.pay_features.forEach(feature => {
          stats.payFeatures[feature] = (stats.payFeatures[feature] || 0) + 1;
        });
      }

      // Text comments
      if (fb.problem_to_solve) stats.textComments.problemToSolve.push(fb.problem_to_solve);
      if (fb.what_liked) stats.textComments.whatLiked.push(fb.what_liked);
      if (fb.what_to_improve) stats.textComments.whatToImprove.push(fb.what_to_improve);
      if (fb.similar_app_name) stats.textComments.similarAppNames.push(fb.similar_app_name);
      if (fb.pay_features_other) stats.textComments.payFeaturesOther.push(fb.pay_features_other);
      if (fb.payment_comment) stats.textComments.paymentComments.push(fb.payment_comment);
    });

    setFeedbackStats(stats);
  };

  const loadMetrics = async () => {
    const { data: metricsData } = await supabase
      .from('usage_metrics')
      .select('event_type, session_id, user_id, event_data');

    if (metricsData) {
      const uniqueSessions = new Set(metricsData.map(m => m.session_id));
      const uniqueUsers = new Set(metricsData.map(m => m.user_id).filter(Boolean));
      
      const eventCounts: Record<string, number> = {};
      metricsData.forEach(m => {
        eventCounts[m.event_type] = (eventCounts[m.event_type] || 0) + 1;
      });

      const topEvents = Object.entries(eventCounts)
        .map(([event_type, count]) => ({ event_type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      setMetrics({
        totalSessions: uniqueSessions.size,
        totalEvents: metricsData.length,
        uniqueUsers: uniqueUsers.size,
        topEvents,
      });

      let totalImages = 0;
      let totalObjects = 0;
      let totalLights = 0;
      let totalExposureSeconds = 0;
      const filterCounts: Record<string, number> = {};
      const constellationCounts: Record<string, number> = {};

      metricsData.forEach(m => {
        const data = m.event_data as Record<string, any> | null;
        if (!data) return;

        if (data.images_count) totalImages += Number(data.images_count) || 0;
        if (data.image_uploaded) totalImages += 1;
        if (data.objects_count) totalObjects = Math.max(totalObjects, Number(data.objects_count) || 0);
        if (data.object_created) totalObjects += 1;
        if (data.lights) totalLights += Number(data.lights) || 0;
        if (data.exposure_seconds) totalExposureSeconds += Number(data.exposure_seconds) || 0;

        if (data.filter) {
          const filter = String(data.filter);
          filterCounts[filter] = (filterCounts[filter] || 0) + 1;
        }

        if (data.constellation) {
          const constellation = String(data.constellation);
          constellationCounts[constellation] = (constellationCounts[constellation] || 0) + 1;
        }
      });

      const topFilters = Object.entries(filterCounts)
        .map(([filter, count]) => ({ filter, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const topConstellations = Object.entries(constellationCounts)
        .map(([constellation, count]) => ({ constellation, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setAppUsage({
        totalImages,
        totalObjects,
        totalLights,
        totalExposureHours: Math.round((totalExposureSeconds / 3600) * 100) / 100,
        topFilters,
        topConstellations,
      });
    }
  };

  const generateInvitationCode = async () => {
    setGeneratingCode(true);
    try {
      const { error } = await supabase.from('beta_invitations').insert([{
        email: `pending_${Date.now()}@placeholder.local`,
        role: 'tester',
      }]);
      if (error) throw error;
      loadData();
    } catch (err) {
      console.error('Error generating invitation code:', err);
    } finally {
      setGeneratingCode(false);
    }
  };

  const deleteInvitation = async (invitation: Invitation) => {
    setDeletingInvitation(true);
    try {
      const { error } = await supabase
        .from('beta_invitations')
        .delete()
        .eq('id', invitation.id);
      if (error) throw error;
      setInvitationToDelete(null);
      loadData();
    } catch (err) {
      console.error('Error deleting invitation:', err);
    } finally {
      setDeletingInvitation(false);
    }
  };

  const deleteUser = async (user: BetaUserData) => {
    setDeletingUser(true);
    setDeleteError(null);
    try {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { user_id: user.user_id, beta_user_id: user.id },
      });
      if (error) throw new Error(error.message || 'Error al eliminar usuario');
      if (data?.error) throw new Error(data.error);
      setUserToDelete(null);
      loadData();
    } catch (err) {
      console.error('Error deleting user:', err);
      setDeleteError(err instanceof Error ? err.message : 'Error al eliminar usuario');
    } finally {
      setDeletingUser(false);
    }
  };

  const resetAllFeedback = async () => {
    setResettingFeedback(true);
    try {
      const { error } = await supabase
        .from('beta_feedback')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
      
      if (error) throw error;
      
      setShowResetConfirm(false);
      setFeedback([]);
      setFeedbackStats(null);
    } catch (err) {
      console.error('Error resetting feedback:', err);
    } finally {
      setResettingFeedback(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '–';
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatSessionTime = (seconds: number | undefined) => {
    if (!seconds || seconds === 0) return '–';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const avgRating = feedback.length > 0
    ? (feedback.reduce((acc, f) => acc + (f.rating || 0), 0) / feedback.filter(f => f.rating).length).toFixed(1)
    : '–';

  const recommendRate = feedback.length > 0
    ? Math.round((feedback.filter(f => f.would_recommend === true).length / feedback.filter(f => f.would_recommend !== null).length) * 100)
    : 0;

  // Label mappings
  const experienceLevelLabels: Record<string, string> = {
    beginner: 'Principiante',
    intermediate: 'Intermedio',
    advanced: 'Avanzado',
    professional: 'Profesional',
  };

  const usageFrequencyLabels: Record<string, string> = {
    daily: 'A diario',
    weekly: 'Varias veces/semana',
    monthly: 'Varias veces/mes',
    sessions_only: 'Solo en sesiones',
  };

  const usageMomentLabels: Record<string, string> = {
    during_session: 'Durante la sesión',
    after_analysis: 'Después, para analizar',
    future_planning: 'Planificar futuras',
    history_only: 'Registro histórico',
  };

  const previousManagementLabels: Record<string, string> = {
    excel: 'Excel / Sheets',
    dedicated_apps: 'Apps dedicadas',
    loose_notes: 'Notas sueltas',
    no_tracking: 'Sin registro',
  };

  const payFeatureLabels: Record<string, string> = {
    advanced_analysis: 'Análisis avanzados',
    integrations: 'Integraciones',
    mobile_app: 'App móvil',
    cloud_sync: 'Sync cloud',
    export_advanced: 'Export avanzada',
  };

  // Bar chart component
  const BarChart = ({ 
    data, 
    labels, 
    color = 'bg-blue-500',
    title 
  }: { 
    data: Record<string, number>; 
    labels: Record<string, string>;
    color?: string;
    title: string;
  }) => {
    const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
    const maxCount = Math.max(...entries.map(([, count]) => count), 1);
    
    if (entries.length === 0) return null;

    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4">
        <h4 className="font-medium text-slate-900 dark:text-white mb-3 text-sm">{title}</h4>
        <div className="space-y-2">
          {entries.map(([key, count]) => (
            <div key={key} className="flex items-center gap-2">
              <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-5 overflow-hidden">
                <div
                  className={`${color} h-full rounded-full flex items-center px-2`}
                  style={{ width: `${(count / maxCount) * 100}%` }}
                >
                  <span className="text-xs text-white truncate">{labels[key] || key}</span>
                </div>
              </div>
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400 w-8 text-right">{count}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Yes/No chart
  const YesNoChart = ({ 
    data, 
    title,
    yesColor = 'bg-green-500',
    noColor = 'bg-red-500'
  }: { 
    data: { yes: number; no: number }; 
    title: string;
    yesColor?: string;
    noColor?: string;
  }) => {
    const total = data.yes + data.no;
    if (total === 0) return null;

    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4">
        <h4 className="font-medium text-slate-900 dark:text-white mb-3 text-sm">{title}</h4>
        <div className="flex gap-4">
          <div className="flex-1 text-center">
            <div className={`${yesColor} text-white rounded-lg py-2 mb-1`}>
              <span className="text-xl font-bold">{data.yes}</span>
            </div>
            <span className="text-xs text-slate-500">Sí</span>
          </div>
          <div className="flex-1 text-center">
            <div className={`${noColor} text-white rounded-lg py-2 mb-1`}>
              <span className="text-xl font-bold">{data.no}</span>
            </div>
            <span className="text-xs text-slate-500">No</span>
          </div>
        </div>
        <div className="mt-2 text-center text-xs text-slate-400">
          {Math.round((data.yes / total) * 100)}% respondió Sí
        </div>
      </div>
    );
  };

  // Ease of use chart
  const EaseOfUseChart = ({ data }: { data: Record<number, number> }) => {
    const total = Object.values(data).reduce((a, b) => a + b, 0);
    if (total === 0) return null;

    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4">
        <h4 className="font-medium text-slate-900 dark:text-white mb-3 text-sm">Facilidad de uso (1=fácil, 5=difícil)</h4>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map(num => (
            <div key={num} className="flex-1 text-center">
              <div className={`rounded-lg py-2 mb-1 ${
                num <= 2 ? 'bg-green-500' : num === 3 ? 'bg-amber-500' : 'bg-red-500'
              } text-white`}>
                <span className="text-lg font-bold">{data[num] || 0}</span>
              </div>
              <span className="text-xs text-slate-500">{num}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Text comments section
  const TextCommentsSection = ({ title, comments }: { title: string; comments: string[] }) => {
    if (comments.length === 0) return null;

    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4">
        <h4 className="font-medium text-slate-900 dark:text-white mb-3 text-sm">{title}</h4>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {comments.map((comment, i) => (
            <div key={i} className="p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg text-sm text-slate-600 dark:text-slate-300">
              "{comment}"
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (verificationError) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{verificationError}</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6">No tienes permisos para acceder al panel de administración.</p>
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium"
          >
            Volver a la app
          </button>
        </div>
      </div>
    );
  }

  if (!isVerifiedAdmin) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-slate-400 mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 dark:bg-slate-900 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Panel de Administración</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={onSignOut}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
            title="Cerrar sesión"
          >
            <LogOut className="w-5 h-5" />
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium"
          >
            Volver a la app
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto p-4">
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: 'invitations', icon: Mail, label: 'Invitaciones' },
            { id: 'users', icon: Users, label: 'Usuarios' },
            { id: 'feedback', icon: MessageSquare, label: 'Feedback' },
            { id: 'metrics', icon: BarChart3, label: 'Métricas' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <>
            {/* Invitations Tab */}
            {activeTab === 'invitations' && (
              <div className="space-y-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {invitations.length} / {BETA_CONFIG.MAX_TESTERS} códigos generados
                    </p>
                  </div>
                  <button
                    onClick={generateInvitationCode}
                    disabled={generatingCode || invitations.length >= BETA_CONFIG.MAX_TESTERS}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium disabled:opacity-50 flex items-center gap-2"
                  >
                    {generatingCode ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Generar código
                  </button>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left p-3 text-sm font-medium text-slate-500 dark:text-slate-400">Código</th>
                        <th className="text-left p-3 text-sm font-medium text-slate-500 dark:text-slate-400">Estado</th>
                        <th className="text-left p-3 text-sm font-medium text-slate-500 dark:text-slate-400">Usuario</th>
                        <th className="text-left p-3 text-sm font-medium text-slate-500 dark:text-slate-400">Fecha</th>
                        <th className="text-right p-3 text-sm font-medium text-slate-500 dark:text-slate-400">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invitations.map((inv) => {
                        const hasLinkedUser = !!inv.used_by_email;
                        const isUsed = inv.status === 'accepted' || hasLinkedUser;
                        const isExpired = inv.status === 'expired' || (!isUsed && new Date(inv.expires_at) < new Date());
                        const displayEmail = inv.used_by_email || null;
                        
                        return (
                          <tr key={inv.id} className="border-b border-slate-100 dark:border-slate-700/50 last:border-0">
                            <td className="p-3">
                              <code className={`font-mono text-sm px-2 py-1 rounded ${isUsed ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 line-through' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'}`}>
                                {inv.invitation_code}
                              </code>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                {isUsed ? (
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                ) : isExpired ? (
                                  <XCircle className="w-4 h-4 text-red-500" />
                                ) : (
                                  <Clock className="w-4 h-4 text-amber-500" />
                                )}
                                <span className={`text-sm ${isUsed ? 'text-green-600 dark:text-green-400 font-medium' : isExpired ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                  {isUsed ? 'Usado' : isExpired ? 'Expirado' : 'Disponible'}
                                </span>
                              </div>
                            </td>
                            <td className="p-3 text-sm text-slate-600 dark:text-slate-400">
                              {displayEmail || '—'}
                            </td>
                            <td className="p-3 text-sm text-slate-500 dark:text-slate-400">{formatDate(inv.created_at)}</td>
                            <td className="p-3 text-right">
                              <button
                                onClick={() => setInvitationToDelete(inv)}
                                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                                title="Eliminar invitación"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left p-3 text-sm font-medium text-slate-500 dark:text-slate-400">Email</th>
                      <th className="text-left p-3 text-sm font-medium text-slate-500 dark:text-slate-400">Rol</th>
                      <th className="text-left p-3 text-sm font-medium text-slate-500 dark:text-slate-400">Feedback</th>
                      <th className="text-left p-3 text-sm font-medium text-slate-500 dark:text-slate-400">Tiempo de uso</th>
                      <th className="text-left p-3 text-sm font-medium text-slate-500 dark:text-slate-400">Primer login</th>
                      <th className="text-left p-3 text-sm font-medium text-slate-500 dark:text-slate-400">Último login</th>
                      <th className="text-right p-3 text-sm font-medium text-slate-500 dark:text-slate-400">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b border-slate-100 dark:border-slate-700/50 last:border-0">
                        <td className="p-3 text-slate-900 dark:text-white">{user.email}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            user.role === 'admin'
                              ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                              : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="p-3">
                          {user.has_feedback ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                              <Check className="w-3 h-3" />
                              Completado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                              <Clock className="w-3 h-3" />
                              Pendiente
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-sm text-slate-600 dark:text-slate-400 font-medium">
                          {formatSessionTime(user.total_session_time)}
                        </td>
                        <td className="p-3 text-sm text-slate-500 dark:text-slate-400">{formatDate(user.first_login_at)}</td>
                        <td className="p-3 text-sm text-slate-500 dark:text-slate-400">{formatDate(user.last_login_at)}</td>
                        <td className="p-3 text-right">
                          {user.role !== 'admin' && (
                            <button
                              onClick={() => setUserToDelete(user)}
                              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                              title="Eliminar usuario y todos sus datos"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Feedback Tab */}
            {activeTab === 'feedback' && (
              <div className="space-y-6">
                {/* Header with Reset Button */}
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Análisis de Feedback</h3>
                  <button
                    onClick={() => setShowResetConfirm(true)}
                    disabled={feedback.length === 0}
                    className="px-4 py-2 rounded-lg border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 flex items-center gap-2 text-sm"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Resetear datos
                  </button>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white dark:bg-slate-800 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                        <Star className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Valoración media</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{avgRating} / 5</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-slate-800 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                        <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Tasa recomendación</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{recommendRate}%</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-slate-800 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                        <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Total respuestas</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{feedback.length}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Charts Grid */}
                {feedbackStats && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <BarChart 
                        data={feedbackStats.experienceLevels} 
                        labels={experienceLevelLabels}
                        color="bg-purple-500"
                        title="Nivel de experiencia"
                      />
                      <BarChart 
                        data={feedbackStats.usageFrequencies} 
                        labels={usageFrequencyLabels}
                        color="bg-blue-500"
                        title="Frecuencia de uso"
                      />
                      <BarChart 
                        data={feedbackStats.usageMoments} 
                        labels={usageMomentLabels}
                        color="bg-cyan-500"
                        title="Momento de uso"
                      />
                      <BarChart 
                        data={feedbackStats.previousManagements} 
                        labels={previousManagementLabels}
                        color="bg-amber-500"
                        title="Gestión anterior"
                      />
                      <YesNoChart 
                        data={feedbackStats.usesSimilarApp}
                        title="¿Usa app similar?"
                        yesColor="bg-amber-500"
                        noColor="bg-slate-400"
                      />
                      <YesNoChart 
                        data={feedbackStats.foundConfusing}
                        title="¿Encontró algo confuso?"
                        yesColor="bg-red-500"
                        noColor="bg-green-500"
                      />
                      <EaseOfUseChart data={feedbackStats.easeOfUse} />
                      <BarChart 
                        data={feedbackStats.payFeatures} 
                        labels={payFeatureLabels}
                        color="bg-emerald-500"
                        title="Características por las que pagarían"
                      />
                    </div>

                    {/* Text Comments */}
                    <div>
                      <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">Comentarios de texto</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <TextCommentsSection 
                          title="Problemas que resuelve Astroboard" 
                          comments={feedbackStats.textComments.problemToSolve} 
                        />
                        <TextCommentsSection 
                          title="Lo que más les gustó" 
                          comments={feedbackStats.textComments.whatLiked} 
                        />
                        <TextCommentsSection 
                          title="Lo que mejorarían" 
                          comments={feedbackStats.textComments.whatToImprove} 
                        />
                        <TextCommentsSection 
                          title="Apps similares que usan" 
                          comments={feedbackStats.textComments.similarAppNames} 
                        />
                        <TextCommentsSection 
                          title="Otras características por pagar" 
                          comments={feedbackStats.textComments.payFeaturesOther} 
                        />
                        <TextCommentsSection 
                          title="Comentarios de pago" 
                          comments={feedbackStats.textComments.paymentComments} 
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Individual Feedback List */}
                <div>
                  <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">Respuestas individuales</h3>
                  <div className="space-y-3">
                    {feedback.map((fb) => (
                      <div key={fb.id} className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden">
                        <button
                          onClick={() => setExpandedFeedback(expandedFeedback === fb.id ? null : fb.id)}
                          className="w-full p-4 flex items-center justify-between text-left"
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-4 h-4 ${
                                    star <= (fb.rating || 0)
                                      ? 'fill-yellow-400 text-yellow-400'
                                      : 'text-slate-300 dark:text-slate-600'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm text-slate-600 dark:text-slate-400">{fb.beta_users?.email}</span>
                            <span className="text-xs text-slate-400">{formatDate(fb.created_at)}</span>
                          </div>
                          {expandedFeedback === fb.id ? (
                            <ChevronUp className="w-5 h-5 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-slate-400" />
                          )}
                        </button>
                        {expandedFeedback === fb.id && (
                          <div className="px-4 pb-4 space-y-3 border-t border-slate-200 dark:border-slate-700 pt-3">
                            {fb.experience_level && (
                              <div>
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Nivel de experiencia</p>
                                <p className="text-slate-600 dark:text-slate-400">{experienceLevelLabels[fb.experience_level] || fb.experience_level}</p>
                              </div>
                            )}
                            {fb.usage_frequency && (
                              <div>
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Frecuencia de uso</p>
                                <p className="text-slate-600 dark:text-slate-400">{usageFrequencyLabels[fb.usage_frequency] || fb.usage_frequency}</p>
                              </div>
                            )}
                            {fb.usage_moment && (
                              <div>
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Momento de uso</p>
                                <p className="text-slate-600 dark:text-slate-400">{usageMomentLabels[fb.usage_moment] || fb.usage_moment}</p>
                              </div>
                            )}
                            {fb.previous_management && (
                              <div>
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Gestión anterior</p>
                                <p className="text-slate-600 dark:text-slate-400">{previousManagementLabels[fb.previous_management] || fb.previous_management}</p>
                              </div>
                            )}
                            {fb.uses_similar_app !== null && (
                              <div>
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">¿Usa app similar?</p>
                                <p className="text-slate-600 dark:text-slate-400">
                                  {fb.uses_similar_app ? 'Sí' : 'No'}
                                  {fb.similar_app_name && ` - ${fb.similar_app_name}`}
                                </p>
                              </div>
                            )}
                            {fb.problem_to_solve && (
                              <div>
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Problema que resuelve</p>
                                <p className="text-slate-600 dark:text-slate-400">{fb.problem_to_solve}</p>
                              </div>
                            )}
                            {fb.ease_of_use && (
                              <div>
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Facilidad de uso</p>
                                <p className="text-slate-600 dark:text-slate-400">{fb.ease_of_use}/5 (1=fácil, 5=difícil)</p>
                              </div>
                            )}
                            {fb.found_confusing !== null && (
                              <div>
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">¿Encontró algo confuso?</p>
                                <p className="text-slate-600 dark:text-slate-400">{fb.found_confusing ? 'Sí' : 'No'}</p>
                              </div>
                            )}
                            {fb.what_liked && (
                              <div>
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">¿Qué le gustó?</p>
                                <p className="text-slate-600 dark:text-slate-400">{fb.what_liked}</p>
                              </div>
                            )}
                            {fb.what_to_improve && (
                              <div>
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">¿Qué mejoraría?</p>
                                <p className="text-slate-600 dark:text-slate-400">{fb.what_to_improve}</p>
                              </div>
                            )}
                            {fb.would_recommend !== null && (
                              <div>
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">¿Recomendaría?</p>
                                <p className="text-slate-600 dark:text-slate-400">
                                  {fb.would_recommend ? 'Sí' : 'No'}
                                  {fb.recommend_comment && ` - ${fb.recommend_comment}`}
                                </p>
                              </div>
                            )}
                            {fb.pay_features && fb.pay_features.length > 0 && (
                              <div>
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Pagaría por</p>
                                <p className="text-slate-600 dark:text-slate-400">
                                  {fb.pay_features.map(f => payFeatureLabels[f] || f).join(', ')}
                                  {fb.pay_features_other && `, ${fb.pay_features_other}`}
                                </p>
                              </div>
                            )}
                            {fb.payment_preference && (
                              <div>
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Preferencia de pago</p>
                                <p className="text-slate-600 dark:text-slate-400">
                                  {fb.payment_preference === 'one_time' ? 'Pago único' : fb.payment_preference === 'subscription' ? 'Suscripción' : 'Indeciso'}
                                  {fb.payment_comment && ` - ${fb.payment_comment}`}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Metrics Tab */}
            {activeTab === 'metrics' && metrics && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">Métricas de uso</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-4">
                      <p className="text-sm text-slate-500 dark:text-slate-400">Usuarios únicos</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">{metrics.uniqueUsers}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-4">
                      <p className="text-sm text-slate-500 dark:text-slate-400">Sesiones totales</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">{metrics.totalSessions}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-4">
                      <p className="text-sm text-slate-500 dark:text-slate-400">Eventos registrados</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">{metrics.totalEvents}</p>
                    </div>
                  </div>
                </div>

                {appUsage && (
                  <div>
                    <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">Métricas de contenido</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white dark:bg-slate-800 rounded-xl p-4">
                        <p className="text-sm text-slate-500 dark:text-slate-400">Imágenes subidas</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{appUsage.totalImages}</p>
                      </div>
                      <div className="bg-white dark:bg-slate-800 rounded-xl p-4">
                        <p className="text-sm text-slate-500 dark:text-slate-400">Objetos creados</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{appUsage.totalObjects}</p>
                      </div>
                      <div className="bg-white dark:bg-slate-800 rounded-xl p-4">
                        <p className="text-sm text-slate-500 dark:text-slate-400">Lights totales</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{appUsage.totalLights.toLocaleString()}</p>
                      </div>
                      <div className="bg-white dark:bg-slate-800 rounded-xl p-4">
                        <p className="text-sm text-slate-500 dark:text-slate-400">Horas de exposición</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{appUsage.totalExposureHours}h</p>
                      </div>
                    </div>
                  </div>
                )}

                {appUsage && appUsage.topFilters.length > 0 && (
                  <div className="bg-white dark:bg-slate-800 rounded-xl p-4">
                    <h3 className="font-medium text-slate-900 dark:text-white mb-3">Filtros más usados</h3>
                    <div className="space-y-2">
                      {appUsage.topFilters.map((item, i) => (
                        <div key={item.filter} className="flex items-center gap-3">
                          <span className="text-sm text-slate-500 dark:text-slate-400 w-6">{i + 1}.</span>
                          <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-6 overflow-hidden">
                            <div
                              className="bg-purple-500 h-full rounded-full flex items-center px-2"
                              style={{
                                width: `${(item.count / appUsage.topFilters[0].count) * 100}%`,
                              }}
                            >
                              <span className="text-xs text-white truncate">{item.filter}</span>
                            </div>
                          </div>
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300 w-12 text-right">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {appUsage && appUsage.topConstellations.length > 0 && (
                  <div className="bg-white dark:bg-slate-800 rounded-xl p-4">
                    <h3 className="font-medium text-slate-900 dark:text-white mb-3">Constelaciones más fotografiadas</h3>
                    <div className="space-y-2">
                      {appUsage.topConstellations.map((item, i) => (
                        <div key={item.constellation} className="flex items-center gap-3">
                          <span className="text-sm text-slate-500 dark:text-slate-400 w-6">{i + 1}.</span>
                          <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-6 overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full rounded-full flex items-center px-2"
                              style={{
                                width: `${(item.count / appUsage.topConstellations[0].count) * 100}%`,
                              }}
                            >
                              <span className="text-xs text-white truncate">{item.constellation}</span>
                            </div>
                          </div>
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300 w-12 text-right">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-white dark:bg-slate-800 rounded-xl p-4">
                  <h3 className="font-medium text-slate-900 dark:text-white mb-3">Eventos más frecuentes</h3>
                  <div className="space-y-2">
                    {metrics.topEvents.map((event, i) => (
                      <div key={event.event_type} className="flex items-center gap-3">
                        <span className="text-sm text-slate-500 dark:text-slate-400 w-6">{i + 1}.</span>
                        <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-6 overflow-hidden">
                          <div
                            className="bg-blue-500 h-full rounded-full flex items-center px-2"
                            style={{
                              width: `${(event.count / metrics.topEvents[0].count) * 100}%`,
                            }}
                          >
                            <span className="text-xs text-white truncate">{event.event_type}</span>
                          </div>
                        </div>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 w-12 text-right">{event.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={!!userToDelete} onOpenChange={() => { setUserToDelete(null); setDeleteError(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Eliminar usuario
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                ¿Estás seguro de que quieres eliminar a <strong>{userToDelete?.email}</strong>?
              </p>
              <p className="text-red-600 dark:text-red-400 font-medium">
                Esta acción eliminará permanentemente:
              </p>
              <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-400">
                <li>La cuenta del usuario</li>
                <li>Todos sus datos almacenados (JSON)</li>
                <li>Todas sus imágenes subidas</li>
                <li>Su historial de feedback</li>
                <li>Sus métricas de uso</li>
              </ul>
              <p className="text-red-600 dark:text-red-400 font-semibold">
                Esta acción no se puede deshacer.
              </p>
              {deleteError && (
                <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-300 text-sm">
                  {deleteError}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingUser}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (userToDelete) {
                  deleteUser(userToDelete);
                }
              }}
              disabled={deletingUser}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deletingUser ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Eliminando...
                </>
              ) : (
                'Eliminar usuario'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Invitation Confirmation Dialog */}
      <AlertDialog open={!!invitationToDelete} onOpenChange={() => setInvitationToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Eliminar invitación
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                ¿Estás seguro de que quieres eliminar esta invitación?
              </p>
              <p className="font-mono text-sm bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded inline-block">
                {invitationToDelete?.invitation_code}
              </p>
              {invitationToDelete?.used_by_email && (
                <p className="text-amber-600 dark:text-amber-400">
                  Esta invitación fue usada por: {invitationToDelete.used_by_email}
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingInvitation}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (invitationToDelete) {
                  deleteInvitation(invitationToDelete);
                }
              }}
              disabled={deletingInvitation}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deletingInvitation ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Eliminando...
                </>
              ) : (
                'Eliminar invitación'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Feedback Confirmation Dialog */}
      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Resetear todos los datos de feedback
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                ¿Estás seguro de que quieres eliminar <strong>todas las respuestas de feedback</strong>?
              </p>
              <p className="text-red-600 dark:text-red-400 font-medium">
                Se eliminarán {feedback.length} respuestas de forma permanente.
              </p>
              <p className="text-red-600 dark:text-red-400 font-semibold">
                Esta acción no se puede deshacer.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resettingFeedback}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                resetAllFeedback();
              }}
              disabled={resettingFeedback}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {resettingFeedback ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Eliminando...
                </>
              ) : (
                'Eliminar todo el feedback'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
