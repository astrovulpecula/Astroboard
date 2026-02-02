import React, { useState } from 'react';
import { MessageSquare, X, Star, Send, Loader2, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { BETA_CONFIG, PaymentPreference } from '../config';
import type { BetaUser } from '../hooks/useBetaAuth';

interface FeedbackWidgetProps {
  betaUser: BetaUser;
  onFeedbackSubmitted?: () => void;
}

type UsageFrequency = 'daily' | 'weekly' | 'monthly' | 'sessions_only';
type UsageMoment = 'during_session' | 'after_analysis' | 'future_planning' | 'history_only';
type PreviousManagement = 'excel' | 'dedicated_apps' | 'loose_notes' | 'no_tracking';
type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced' | 'professional';
type PayFeature = 'advanced_analysis' | 'integrations' | 'mobile_app' | 'cloud_sync' | 'export_advanced';

export function FeedbackWidget({ betaUser, onFeedbackSubmitted }: FeedbackWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const totalSteps = 14;
  
  // Form state - existing
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [whatLiked, setWhatLiked] = useState('');
  const [whatToImprove, setWhatToImprove] = useState('');
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  const [recommendComment, setRecommendComment] = useState('');
  const [paymentPreference, setPaymentPreference] = useState<PaymentPreference | null>(null);
  const [paymentComment, setPaymentComment] = useState('');
  
  // Form state - new questions
  const [usageFrequency, setUsageFrequency] = useState<UsageFrequency | null>(null);
  const [usageMoment, setUsageMoment] = useState<UsageMoment | null>(null);
  const [problemToSolve, setProblemToSolve] = useState('');
  const [foundConfusing, setFoundConfusing] = useState<boolean | null>(null);
  const [easeOfUse, setEaseOfUse] = useState<number | null>(null);
  const [previousManagement, setPreviousManagement] = useState<PreviousManagement | null>(null);
  const [usesSimilarApp, setUsesSimilarApp] = useState<boolean | null>(null);
  const [similarAppName, setSimilarAppName] = useState('');
  const [payFeatures, setPayFeatures] = useState<PayFeature[]>([]);
  const [payFeaturesOther, setPayFeaturesOther] = useState('');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel | null>(null);

  const resetForm = () => {
    setStep(1);
    setRating(0);
    setWhatLiked('');
    setWhatToImprove('');
    setWouldRecommend(null);
    setRecommendComment('');
    setPaymentPreference(null);
    setPaymentComment('');
    setUsageFrequency(null);
    setUsageMoment(null);
    setProblemToSolve('');
    setFoundConfusing(null);
    setEaseOfUse(null);
    setPreviousManagement(null);
    setUsesSimilarApp(null);
    setSimilarAppName('');
    setPayFeatures([]);
    setPayFeaturesOther('');
    setExperienceLevel(null);
    setSubmitted(false);
  };

  const togglePayFeature = (feature: PayFeature) => {
    setPayFeatures(prev => 
      prev.includes(feature) 
        ? prev.filter(f => f !== feature)
        : [...prev, feature]
    );
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.from('beta_feedback').insert({
        user_id: betaUser.id,
        rating,
        what_liked: whatLiked || null,
        what_to_improve: whatToImprove || null,
        would_recommend: wouldRecommend,
        recommend_comment: recommendComment || null,
        payment_preference: paymentPreference,
        payment_comment: paymentComment || null,
        usage_frequency: usageFrequency,
        usage_moment: usageMoment,
        problem_to_solve: problemToSolve || null,
        found_confusing: foundConfusing,
        ease_of_use: easeOfUse,
        previous_management: previousManagement,
        uses_similar_app: usesSimilarApp,
        similar_app_name: similarAppName || null,
        pay_features: payFeatures.length > 0 ? payFeatures : null,
        pay_features_other: payFeaturesOther || null,
        experience_level: experienceLevel,
      });

      if (error) throw error;
      
      setSubmitted(true);
      onFeedbackSubmitted?.();
      
      setTimeout(() => {
        setIsOpen(false);
        resetForm();
      }, 2000);
    } catch (err) {
      console.error('Error submitting feedback:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!BETA_CONFIG.FEATURES.FEEDBACK_WIDGET) return null;

  const OptionButton = ({ 
    selected, 
    onClick, 
    children,
    className = ''
  }: { 
    selected: boolean; 
    onClick: () => void; 
    children: React.ReactNode;
    className?: string;
  }) => (
    <button
      onClick={onClick}
      type="button"
      className={`w-full p-3 rounded-xl border-2 text-left transition ${
        selected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-slate-300 dark:border-slate-600 hover:border-slate-400'
      } ${className}`}
    >
      {children}
    </button>
  );

  const NavigationButtons = ({ 
    onBack, 
    onNext, 
    nextDisabled = false,
    nextLabel = 'Siguiente',
    showSubmit = false
  }: { 
    onBack: () => void; 
    onNext: () => void;
    nextDisabled?: boolean;
    nextLabel?: string;
    showSubmit?: boolean;
  }) => (
    <div className="flex gap-2">
      <button
        onClick={onBack}
        type="button"
        className="flex-1 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300"
      >
        Atrás
      </button>
      <button
        onClick={onNext}
        disabled={nextDisabled || loading}
        type="button"
        className={`flex-1 py-2 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
          showSubmit 
            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
            : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
        }`}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Enviando...
          </>
        ) : showSubmit ? (
          <>
            <Send className="w-4 h-4" />
            {nextLabel}
          </>
        ) : (
          nextLabel
        )}
      </button>
    </div>
  );

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 p-3 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg hover:shadow-xl transition-all hover:scale-105"
        title="Enviar feedback"
      >
        <MessageSquare className="w-6 h-6" />
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {submitted ? '¡Gracias!' : 'Tu feedback'}
              </h3>
              <button
                onClick={() => { setIsOpen(false); resetForm(); }}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              {submitted ? (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                    <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="text-slate-600 dark:text-slate-300">
                    Tu feedback ha sido enviado. ¡Muchas gracias por ayudarnos a mejorar!
                  </p>
                </div>
              ) : (
                <>
                  {/* Progress */}
                  <div className="flex gap-0.5 mb-6">
                    {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
                      <div
                        key={s}
                        className={`h-1 flex-1 rounded-full transition ${
                          s <= step ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Step 1: Experience Level */}
                  {step === 1 && (
                    <div className="space-y-4">
                      <p className="text-slate-700 dark:text-slate-300 font-medium">
                        ¿Cómo te definirías como astrofotógrafo?
                      </p>
                      <div className="space-y-2">
                        {[
                          { value: 'beginner', label: 'Principiante' },
                          { value: 'intermediate', label: 'Intermedio' },
                          { value: 'advanced', label: 'Avanzado' },
                          { value: 'professional', label: 'Profesional / Remoto' },
                        ].map((option) => (
                          <OptionButton
                            key={option.value}
                            selected={experienceLevel === option.value}
                            onClick={() => setExperienceLevel(option.value as ExperienceLevel)}
                          >
                            <span className="font-medium text-slate-900 dark:text-white">{option.label}</span>
                          </OptionButton>
                        ))}
                      </div>
                      <button
                        onClick={() => setStep(2)}
                        disabled={experienceLevel === null}
                        className="w-full py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Siguiente
                      </button>
                    </div>
                  )}

                  {/* Step 2: Usage Frequency */}
                  {step === 2 && (
                    <div className="space-y-4">
                      <p className="text-slate-700 dark:text-slate-300 font-medium">
                        ¿Con qué frecuencia usarías Astroboard?
                      </p>
                      <div className="space-y-2">
                        {[
                          { value: 'daily', label: 'A diario' },
                          { value: 'weekly', label: 'Varias veces por semana' },
                          { value: 'monthly', label: 'Varias veces al mes' },
                          { value: 'sessions_only', label: 'Solo en sesiones concretas' },
                        ].map((option) => (
                          <OptionButton
                            key={option.value}
                            selected={usageFrequency === option.value}
                            onClick={() => setUsageFrequency(option.value as UsageFrequency)}
                          >
                            <span className="font-medium text-slate-900 dark:text-white">{option.label}</span>
                          </OptionButton>
                        ))}
                      </div>
                      <NavigationButtons 
                        onBack={() => setStep(1)} 
                        onNext={() => setStep(3)}
                        nextDisabled={usageFrequency === null}
                      />
                    </div>
                  )}

                  {/* Step 3: Usage Moment */}
                  {step === 3 && (
                    <div className="space-y-4">
                      <p className="text-slate-700 dark:text-slate-300 font-medium">
                        ¿En qué momento la usas principalmente?
                      </p>
                      <div className="space-y-2">
                        {[
                          { value: 'during_session', label: 'Durante la sesión de astrofotografía' },
                          { value: 'after_analysis', label: 'Después, para analizar resultados' },
                          { value: 'future_planning', label: 'Para planificar sesiones futuras' },
                          { value: 'history_only', label: 'Solo como registro histórico' },
                        ].map((option) => (
                          <OptionButton
                            key={option.value}
                            selected={usageMoment === option.value}
                            onClick={() => setUsageMoment(option.value as UsageMoment)}
                          >
                            <span className="font-medium text-slate-900 dark:text-white">{option.label}</span>
                          </OptionButton>
                        ))}
                      </div>
                      <NavigationButtons 
                        onBack={() => setStep(2)} 
                        onNext={() => setStep(4)}
                        nextDisabled={usageMoment === null}
                      />
                    </div>
                  )}

                  {/* Step 4: Previous Management */}
                  {step === 4 && (
                    <div className="space-y-4">
                      <p className="text-slate-700 dark:text-slate-300 font-medium">
                        Antes de Astroboard, ¿cómo gestionabas tus sesiones?
                      </p>
                      <div className="space-y-2">
                        {[
                          { value: 'excel', label: 'Excel / Google Sheets' },
                          { value: 'dedicated_apps', label: 'Apps dedicadas' },
                          { value: 'loose_notes', label: 'Notas sueltas' },
                          { value: 'no_tracking', label: 'No llevaba registro' },
                        ].map((option) => (
                          <OptionButton
                            key={option.value}
                            selected={previousManagement === option.value}
                            onClick={() => setPreviousManagement(option.value as PreviousManagement)}
                          >
                            <span className="font-medium text-slate-900 dark:text-white">{option.label}</span>
                          </OptionButton>
                        ))}
                      </div>
                      <NavigationButtons 
                        onBack={() => setStep(3)} 
                        onNext={() => setStep(5)}
                        nextDisabled={previousManagement === null}
                      />
                    </div>
                  )}

                  {/* Step 5: Uses Similar App */}
                  {step === 5 && (
                    <div className="space-y-4">
                      <p className="text-slate-700 dark:text-slate-300 font-medium">
                        ¿Usas actualmente alguna otra app similar?
                      </p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setUsesSimilarApp(true)}
                          type="button"
                          className={`flex-1 py-3 rounded-xl border-2 transition ${
                            usesSimilarApp === true
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                              : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          Sí
                        </button>
                        <button
                          onClick={() => { setUsesSimilarApp(false); setSimilarAppName(''); }}
                          type="button"
                          className={`flex-1 py-3 rounded-xl border-2 transition ${
                            usesSimilarApp === false
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                              : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          No
                        </button>
                      </div>
                      {usesSimilarApp === true && (
                        <input
                          type="text"
                          value={similarAppName}
                          onChange={(e) => setSimilarAppName(e.target.value)}
                          placeholder="¿Cuál?"
                          className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      )}
                      <NavigationButtons 
                        onBack={() => setStep(4)} 
                        onNext={() => setStep(6)}
                        nextDisabled={usesSimilarApp === null}
                      />
                    </div>
                  )}

                  {/* Step 6: Problem to Solve */}
                  {step === 6 && (
                    <div className="space-y-4">
                      <p className="text-slate-700 dark:text-slate-300 font-medium">
                        ¿Qué problema te ayudaría a resolver Astroboard?
                      </p>
                      <textarea
                        value={problemToSolve}
                        onChange={(e) => setProblemToSolve(e.target.value)}
                        placeholder="Describe el problema o necesidad que Astroboard te ayuda a solucionar..."
                        className="w-full h-32 p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <NavigationButtons 
                        onBack={() => setStep(5)} 
                        onNext={() => setStep(7)}
                      />
                    </div>
                  )}

                  {/* Step 7: Ease of Use */}
                  {step === 7 && (
                    <div className="space-y-4">
                      <p className="text-slate-700 dark:text-slate-300 font-medium">
                        ¿Cuánto de fácil te ha resultado empezar a usar Astroboard?
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        (1 = Muy fácil, 5 = Muy difícil)
                      </p>
                      <div className="flex justify-center gap-2">
                        {[1, 2, 3, 4, 5].map((num) => (
                          <button
                            key={num}
                            onClick={() => setEaseOfUse(num)}
                            type="button"
                            className={`w-12 h-12 rounded-xl border-2 font-bold transition ${
                              easeOfUse === num
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                                : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                      <NavigationButtons 
                        onBack={() => setStep(6)} 
                        onNext={() => setStep(8)}
                        nextDisabled={easeOfUse === null}
                      />
                    </div>
                  )}

                  {/* Step 8: Found Confusing */}
                  {step === 8 && (
                    <div className="space-y-4">
                      <p className="text-slate-700 dark:text-slate-300 font-medium">
                        En cuanto al diseño: ¿Has encontrado algo confuso?
                      </p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setFoundConfusing(true)}
                          type="button"
                          className={`flex-1 py-3 rounded-xl border-2 transition ${
                            foundConfusing === true
                              ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
                              : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          Sí
                        </button>
                        <button
                          onClick={() => setFoundConfusing(false)}
                          type="button"
                          className={`flex-1 py-3 rounded-xl border-2 transition ${
                            foundConfusing === false
                              ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                              : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          No
                        </button>
                      </div>
                      <NavigationButtons 
                        onBack={() => setStep(7)} 
                        onNext={() => setStep(9)}
                        nextDisabled={foundConfusing === null}
                      />
                    </div>
                  )}

                  {/* Step 9: Rating */}
                  {step === 9 && (
                    <div className="space-y-4">
                      <p className="text-slate-700 dark:text-slate-300 font-medium">
                        ¿Cómo valorarías tu experiencia general?
                      </p>
                      <div className="flex justify-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setRating(star)}
                            onMouseEnter={() => setHoveredRating(star)}
                            onMouseLeave={() => setHoveredRating(0)}
                            type="button"
                            className="p-1 transition-transform hover:scale-110"
                          >
                            <Star
                              className={`w-10 h-10 transition ${
                                star <= (hoveredRating || rating)
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-slate-300 dark:text-slate-600'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                      <NavigationButtons 
                        onBack={() => setStep(8)} 
                        onNext={() => setStep(10)}
                        nextDisabled={rating === 0}
                      />
                    </div>
                  )}

                  {/* Step 10: What liked */}
                  {step === 10 && (
                    <div className="space-y-4">
                      <p className="text-slate-700 dark:text-slate-300 font-medium">
                        ¿Qué es lo que más te ha gustado?
                      </p>
                      <textarea
                        value={whatLiked}
                        onChange={(e) => setWhatLiked(e.target.value)}
                        placeholder="Cuéntanos qué funcionalidades te parecen más útiles..."
                        className="w-full h-32 p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <NavigationButtons 
                        onBack={() => setStep(9)} 
                        onNext={() => setStep(11)}
                      />
                    </div>
                  )}

                  {/* Step 11: What to improve */}
                  {step === 11 && (
                    <div className="space-y-4">
                      <p className="text-slate-700 dark:text-slate-300 font-medium">
                        ¿Qué mejorarías?
                      </p>
                      <textarea
                        value={whatToImprove}
                        onChange={(e) => setWhatToImprove(e.target.value)}
                        placeholder="¿Qué cambiarías o añadirías?"
                        className="w-full h-32 p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <NavigationButtons 
                        onBack={() => setStep(10)} 
                        onNext={() => setStep(12)}
                      />
                    </div>
                  )}

                  {/* Step 12: Would recommend */}
                  {step === 12 && (
                    <div className="space-y-4">
                      <p className="text-slate-700 dark:text-slate-300 font-medium">
                        ¿Recomendarías Astroboard a otros astrofotógrafos?
                      </p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setWouldRecommend(true)}
                          type="button"
                          className={`flex-1 py-3 rounded-xl border-2 transition ${
                            wouldRecommend === true
                              ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                              : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          Sí 👍
                        </button>
                        <button
                          onClick={() => setWouldRecommend(false)}
                          type="button"
                          className={`flex-1 py-3 rounded-xl border-2 transition ${
                            wouldRecommend === false
                              ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                              : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          No 👎
                        </button>
                      </div>
                      <textarea
                        value={recommendComment}
                        onChange={(e) => setRecommendComment(e.target.value)}
                        placeholder="¿Por qué? (opcional)"
                        className="w-full h-20 p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <NavigationButtons 
                        onBack={() => setStep(11)} 
                        onNext={() => setStep(13)}
                        nextDisabled={wouldRecommend === null}
                      />
                    </div>
                  )}

                  {/* Step 13: Pay Features */}
                  {step === 13 && (
                    <div className="space-y-4">
                      <p className="text-slate-700 dark:text-slate-300 font-medium">
                        ¿Qué haría que pagaras por Astroboard?
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        (Selecciona todas las que apliquen)
                      </p>
                      <div className="space-y-2">
                        {[
                          { value: 'advanced_analysis', label: 'Más análisis avanzados' },
                          { value: 'integrations', label: 'Integraciones (PHD2, NINA, etc.)' },
                          { value: 'mobile_app', label: 'App móvil nativa' },
                          { value: 'cloud_sync', label: 'Sincronización cloud' },
                          { value: 'export_advanced', label: 'Exportación avanzada' },
                        ].map((option) => (
                          <button
                            key={option.value}
                            onClick={() => togglePayFeature(option.value as PayFeature)}
                            type="button"
                            className={`w-full p-3 rounded-xl border-2 text-left transition flex items-center gap-3 ${
                              payFeatures.includes(option.value as PayFeature)
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-slate-300 dark:border-slate-600 hover:border-slate-400'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              payFeatures.includes(option.value as PayFeature)
                                ? 'border-blue-500 bg-blue-500'
                                : 'border-slate-400'
                            }`}>
                              {payFeatures.includes(option.value as PayFeature) && (
                                <Check className="w-3 h-3 text-white" />
                              )}
                            </div>
                            <span className="font-medium text-slate-900 dark:text-white">{option.label}</span>
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        value={payFeaturesOther}
                        onChange={(e) => setPayFeaturesOther(e.target.value)}
                        placeholder="Otra característica (opcional)"
                        className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <NavigationButtons 
                        onBack={() => setStep(12)} 
                        onNext={() => setStep(14)}
                      />
                    </div>
                  )}

                  {/* Step 14: Payment preference */}
                  {step === 14 && (
                    <div className="space-y-4">
                      <p className="text-slate-700 dark:text-slate-300 font-medium">
                        ¿Qué modelo de pago preferirías?
                      </p>
                      <div className="space-y-2">
                        <OptionButton
                          selected={paymentPreference === 'one_time'}
                          onClick={() => setPaymentPreference('one_time')}
                        >
                          <span className="font-medium text-slate-900 dark:text-white">Pago único</span>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            Un solo pago para acceso permanente
                          </p>
                        </OptionButton>
                        <OptionButton
                          selected={paymentPreference === 'subscription'}
                          onClick={() => setPaymentPreference('subscription')}
                        >
                          <span className="font-medium text-slate-900 dark:text-white">Suscripción mensual/anual</span>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            Pago recurrente con precio reducido
                          </p>
                        </OptionButton>
                        <OptionButton
                          selected={paymentPreference === 'undecided'}
                          onClick={() => setPaymentPreference('undecided')}
                        >
                          <span className="font-medium text-slate-900 dark:text-white">No estoy seguro</span>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            Necesito más información
                          </p>
                        </OptionButton>
                      </div>
                      <textarea
                        value={paymentComment}
                        onChange={(e) => setPaymentComment(e.target.value)}
                        placeholder="¿Cuánto estarías dispuesto a pagar? (opcional)"
                        className="w-full h-20 p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <NavigationButtons 
                        onBack={() => setStep(13)} 
                        onNext={handleSubmit}
                        nextDisabled={paymentPreference === null}
                        nextLabel="Enviar feedback"
                        showSubmit
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
