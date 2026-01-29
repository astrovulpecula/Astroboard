import React, { useState } from 'react';
import { BETA_CONFIG } from '../config';
import { useBetaAuth, type BetaUser } from '../hooks/useBetaAuth';
import { useUsageMetrics } from '../hooks/useUsageMetrics';
import { BetaProvider } from '../context/BetaContext';
import { BetaAuthPage } from './BetaAuthPage';
import { GdprModal } from './GdprModal';
import { WelcomeModal } from './WelcomeModal';
import { FeedbackWidget } from './FeedbackWidget';
import { AdminDashboard } from './AdminDashboard';
import { Loader2, Shield } from 'lucide-react';

interface BetaGateProps {
  children: React.ReactNode;
}

export function BetaGate({ children }: BetaGateProps) {
  const {
    user,
    betaUser,
    loading,
    isAdmin,
    isAuthenticated,
    needsGdprAcceptance,
    needsWelcome,
    signIn,
    signUp,
    signOut,
    acceptGdpr,
    markWelcomeShown,
  } = useBetaAuth();

  const { trackEvent } = useUsageMetrics(betaUser);
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  // If beta is disabled, just render children
  if (!BETA_CONFIG.BETA_ENABLED) {
    return <>{children}</>;
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-slate-400 mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">Cargando...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - show auth page
  if (!isAuthenticated) {
    return <BetaAuthPage onSignIn={signIn} onSignUp={signUp} />;
  }

  // Needs GDPR acceptance
  if (needsGdprAcceptance) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900 p-4">
          <div className="text-center">
            <Shield className="w-12 h-12 text-blue-500 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400">
              Por favor, acepta nuestra política de privacidad para continuar.
            </p>
          </div>
        </div>
        <GdprModal open={true} onAccept={acceptGdpr} />
      </>
    );
  }

  // Show welcome modal on first login
  if (needsWelcome) {
    return (
      <>
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900" />
        <WelcomeModal
          open={true}
          userName={betaUser?.email}
          onContinue={markWelcomeShown}
        />
      </>
    );
  }

  // Admin viewing admin panel
  if (showAdminPanel && isAdmin && betaUser) {
    return (
      <AdminDashboard
        betaUser={betaUser}
        onClose={() => setShowAdminPanel(false)}
        onSignOut={signOut}
      />
    );
  }

  // Authenticated and ready - render app with beta features
  return (
    <BetaProvider betaUser={betaUser} isAdmin={isAdmin}>
      {/* Admin button */}
      {isAdmin && (
        <button
          onClick={() => setShowAdminPanel(true)}
          className="fixed top-4 right-4 z-50 p-2 rounded-full bg-purple-600 text-white shadow-lg hover:bg-purple-700 transition"
          title="Panel de administración"
        >
          <Shield className="w-5 h-5" />
        </button>
      )}

      {/* Feedback widget */}
      {betaUser && (
        <FeedbackWidget
          betaUser={betaUser}
          onFeedbackSubmitted={() => trackEvent('feedback_submitted')}
        />
      )}

      {/* App content */}
      {children}
    </BetaProvider>
  );
}

// Export context for app to access beta user info
export { useBetaAuth, useUsageMetrics };
export type { BetaUser };
