import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, Key, Loader2, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import logoLight from '@/assets/logo-light.png';
import logoDark from '@/assets/logo-dark.png';

interface BetaAuthPageProps {
  onSignIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  onSignUp: (email: string, password: string, code: string) => Promise<{ error: Error | null }>;
}

export function BetaAuthPage({ onSignIn, onSignUp }: BetaAuthPageProps) {
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [invitationCode, setInvitationCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (mode === 'reset') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (resetError) {
          setError(resetError.message);
        } else {
          setSuccess('Se ha enviado un enlace de recuperación a tu email.');
        }
        setLoading(false);
        return;
      }

      let result;
      if (mode === 'signin') {
        result = await onSignIn(email, password);
      } else {
        if (!invitationCode.trim()) {
          setError('El código de invitación es obligatorio');
          setLoading(false);
          return;
        }
        result = await onSignUp(email, password, invitationCode.trim());
      }

      if (result.error) {
        setError(result.error.message);
      } else if (mode === 'signup') {
        // Registration successful
        setSuccess('¡Cuenta creada correctamente! Ya puedes iniciar sesión.');
        setMode('signin');
        setPassword('');
        setInvitationCode('');
      }
    } catch (err) {
      setError('Ha ocurrido un error. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const isDark = typeof window !== 'undefined' && 
    (document.documentElement.classList.contains('dark') || 
     document.documentElement.getAttribute('data-theme') === 'dark');

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img 
            src={isDark ? logoDark : logoLight} 
            alt="Astroboard" 
            className="h-16 mx-auto mb-4"
          />
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm">
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            Beta Cerrada
          </div>
        </div>

        {/* Card */}
        <div className="glass-card rounded-2xl shadow-xl p-6 md:p-8">
          {/* Tabs or Back button */}
          {mode === 'reset' ? (
            <button
              onClick={() => { setMode('signin'); setError(null); setSuccess(null); }}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver a iniciar sesión
            </button>
          ) : (
            <div className="flex rounded-xl bg-secondary/50 p-1 mb-6">
              <button
                onClick={() => { setMode('signin'); setError(null); setSuccess(null); }}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition ${
                  mode === 'signin'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground'
                }`}
              >
                Iniciar sesión
              </button>
              <button
                onClick={() => { setMode('signup'); setError(null); setSuccess(null); }}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition ${
                  mode === 'signup'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground'
                }`}
              >
                Registrarse
              </button>
            </div>
          )}

          {mode === 'reset' && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Recuperar contraseña
              </h2>
              <p className="text-sm text-muted-foreground">
                Introduce tu email y te enviaremos un enlace para restablecer tu contraseña.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Invitation Code (signup only) */}
            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Código de invitación
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    value={invitationCode}
                    onChange={(e) => setInvitationCode(e.target.value)}
                    placeholder="Introduce tu código"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-secondary/50 text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
                    required
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-secondary/50 text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
                  required
                />
              </div>
            </div>

            {/* Password (not for reset mode) */}
            {mode !== 'reset' && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-12 py-2.5 rounded-xl border border-border bg-secondary/50 text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            )}

            {/* Success */}
            {success && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">
                {success}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !!success}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-medium hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Procesando...
                </>
              ) : mode === 'signin' ? (
                'Iniciar sesión'
              ) : mode === 'signup' ? (
                'Crear cuenta'
              ) : (
                'Enviar enlace'
              )}
            </button>
          </form>

          {mode === 'signin' && (
            <button
              onClick={() => { setMode('reset'); setError(null); setSuccess(null); }}
              className="w-full mt-4 text-center text-sm text-muted-foreground hover:text-foreground transition"
            >
              ¿Has olvidado tu contraseña?
            </button>
          )}

          {mode === 'signup' && (
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Solo puedes registrarte si tienes un código de invitación válido.
            </p>
          )}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Astroboard Beta • {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
