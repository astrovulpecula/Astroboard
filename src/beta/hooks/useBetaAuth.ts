import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BETA_CONFIG, BetaRole } from '../config';
import type { User, Session } from '@supabase/supabase-js';

export interface BetaUser {
  id: string;
  user_id: string;
  email: string;
  role: BetaRole;
  gdpr_accepted: boolean;
  gdpr_accepted_at: string | null;
  welcome_shown: boolean;
  first_login_at: string | null;
  last_login_at: string | null;
  created_at: string;
}

interface UseBetaAuthReturn {
  user: User | null;
  betaUser: BetaUser | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  isAuthenticated: boolean;
  needsGdprAcceptance: boolean;
  needsWelcome: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, invitationCode: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  acceptGdpr: () => Promise<void>;
  markWelcomeShown: () => Promise<void>;
  refreshBetaUser: () => Promise<void>;
}

export function useBetaAuth(): UseBetaAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [betaUser, setBetaUser] = useState<BetaUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBetaUser = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('beta_users')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching beta user:', error);
        return null;
      }

      return data as BetaUser | null;
    } catch (err) {
      console.error('Error in fetchBetaUser:', err);
      return null;
    }
  }, []);

  const refreshBetaUser = useCallback(async () => {
    if (user?.id) {
      const betaUserData = await fetchBetaUser(user.id);
      setBetaUser(betaUserData);
    }
  }, [user?.id, fetchBetaUser]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          // Use setTimeout to avoid potential race conditions
          setTimeout(async () => {
            const betaUserData = await fetchBetaUser(currentSession.user.id);
            setBetaUser(betaUserData);
            
            // Update last_login_at
            if (betaUserData) {
              await supabase
                .from('beta_users')
                .update({ last_login_at: new Date().toISOString() })
                .eq('user_id', currentSession.user.id);
            }
            
            setLoading(false);
          }, 0);
        } else {
          setBetaUser(null);
          setLoading(false);
        }
      }
    );

    // THEN check initial session
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);

      if (initialSession?.user) {
        const betaUserData = await fetchBetaUser(initialSession.user.id);
        setBetaUser(betaUserData);
      }
      
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchBetaUser]);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error: error as Error | null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signUp = async (email: string, password: string, invitationCode: string) => {
    try {
      // Verify invitation via secure edge function (no direct table access)
      const verifyResponse = await supabase.functions.invoke('verify-invitation', {
        body: { invitation_code: invitationCode, email },
      });

      if (verifyResponse.error) {
        console.error('Invitation verification failed:', verifyResponse.error);
        return { error: new Error('Error al verificar la invitación') };
      }

      const verifyData = verifyResponse.data as {
        valid: boolean;
        invitation_id?: string;
        role?: string;
        error?: string;
      };

      if (!verifyData.valid) {
        return { error: new Error(verifyData.error || 'Código de invitación inválido') };
      }

      const invitationId = verifyData.invitation_id;
      const invitationRole = verifyData.role;

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (authError) {
        return { error: authError as Error };
      }

      if (!authData.user) {
        return { error: new Error('Error al crear el usuario') };
      }

      // Create beta user profile
      const { error: profileError } = await supabase
        .from('beta_users')
        .insert({
          user_id: authData.user.id,
          email: email.toLowerCase(),
          role: invitationRole as 'admin' | 'tester',
          invitation_id: invitationId,
          first_login_at: new Date().toISOString(),
          last_login_at: new Date().toISOString(),
        });

      if (profileError) {
        console.error('Error creating beta profile:', profileError);
        return { error: new Error('Error al crear el perfil de beta') };
      }

      // Invitation was already marked as accepted in verify-invitation edge function
      // No need to update again here

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setBetaUser(null);
  };

  const acceptGdpr = async () => {
    if (!betaUser) return;

    const { error } = await supabase
      .from('beta_users')
      .update({
        gdpr_accepted: true,
        gdpr_accepted_at: new Date().toISOString(),
      })
      .eq('id', betaUser.id);

    if (!error) {
      setBetaUser({
        ...betaUser,
        gdpr_accepted: true,
        gdpr_accepted_at: new Date().toISOString(),
      });
    }
  };

  const markWelcomeShown = async () => {
    if (!betaUser) return;

    const { error } = await supabase
      .from('beta_users')
      .update({ welcome_shown: true })
      .eq('id', betaUser.id);

    if (!error) {
      setBetaUser({
        ...betaUser,
        welcome_shown: true,
      });
    }
  };

  return {
    user,
    betaUser,
    session,
    loading,
    isAdmin: betaUser?.role === 'admin',
    isAuthenticated: !!user && !!betaUser,
    needsGdprAcceptance: !!betaUser && !betaUser.gdpr_accepted,
    needsWelcome: !!betaUser && betaUser.gdpr_accepted && !betaUser.welcome_shown,
    signIn,
    signUp,
    signOut,
    acceptGdpr,
    markWelcomeShown,
    refreshBetaUser,
  };
}
