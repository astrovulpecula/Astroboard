import React, { useState } from 'react';
import { MessageSquare, X, Star, Send, Loader2, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { BETA_CONFIG, PaymentPreference } from '../config';
import type { BetaUser } from '../hooks/useBetaAuth';

interface FeedbackWidgetProps {
  betaUser: BetaUser;
  onFeedbackSubmitted?: () => void;
}

export function FeedbackWidget({ betaUser, onFeedbackSubmitted }: FeedbackWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  // Form state
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [whatLiked, setWhatLiked] = useState('');
  const [whatToImprove, setWhatToImprove] = useState('');
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  const [recommendComment, setRecommendComment] = useState('');
  const [paymentPreference, setPaymentPreference] = useState<PaymentPreference | null>(null);
  const [paymentComment, setPaymentComment] = useState('');

  const resetForm = () => {
    setStep(1);
    setRating(0);
    setWhatLiked('');
    setWhatToImprove('');
    setWouldRecommend(null);
    setRecommendComment('');
    setPaymentPreference(null);
    setPaymentComment('');
    setSubmitted(false);
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
                  <div className="flex gap-1 mb-6">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <div
                        key={s}
                        className={`h-1 flex-1 rounded-full transition ${
                          s <= step ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Step 1: Rating */}
                  {step === 1 && (
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
                      <button
                        onClick={() => setStep(2)}
                        disabled={rating === 0}
                        className="w-full py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Siguiente
                      </button>
                    </div>
                  )}

                  {/* Step 2: What liked */}
                  {step === 2 && (
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
                      <div className="flex gap-2">
                        <button
                          onClick={() => setStep(1)}
                          className="flex-1 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300"
                        >
                          Atrás
                        </button>
                        <button
                          onClick={() => setStep(3)}
                          className="flex-1 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium"
                        >
                          Siguiente
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 3: What to improve */}
                  {step === 3 && (
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
                      <div className="flex gap-2">
                        <button
                          onClick={() => setStep(2)}
                          className="flex-1 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300"
                        >
                          Atrás
                        </button>
                        <button
                          onClick={() => setStep(4)}
                          className="flex-1 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium"
                        >
                          Siguiente
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 4: Would recommend */}
                  {step === 4 && (
                    <div className="space-y-4">
                      <p className="text-slate-700 dark:text-slate-300 font-medium">
                        ¿Recomendarías Astroboard a otros astrofotógrafos?
                      </p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setWouldRecommend(true)}
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
                      <div className="flex gap-2">
                        <button
                          onClick={() => setStep(3)}
                          className="flex-1 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300"
                        >
                          Atrás
                        </button>
                        <button
                          onClick={() => setStep(5)}
                          disabled={wouldRecommend === null}
                          className="flex-1 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Siguiente
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 5: Payment preference */}
                  {step === 5 && (
                    <div className="space-y-4">
                      <p className="text-slate-700 dark:text-slate-300 font-medium">
                        ¿Qué modelo de pago preferirías?
                      </p>
                      <div className="space-y-2">
                        <button
                          onClick={() => setPaymentPreference('one_time')}
                          className={`w-full p-3 rounded-xl border-2 text-left transition ${
                            paymentPreference === 'one_time'
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          <span className="font-medium text-slate-900 dark:text-white">Pago único</span>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            Un solo pago para acceso permanente
                          </p>
                        </button>
                        <button
                          onClick={() => setPaymentPreference('subscription')}
                          className={`w-full p-3 rounded-xl border-2 text-left transition ${
                            paymentPreference === 'subscription'
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          <span className="font-medium text-slate-900 dark:text-white">Suscripción mensual/anual</span>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            Pago recurrente con precio reducido
                          </p>
                        </button>
                        <button
                          onClick={() => setPaymentPreference('undecided')}
                          className={`w-full p-3 rounded-xl border-2 text-left transition ${
                            paymentPreference === 'undecided'
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          <span className="font-medium text-slate-900 dark:text-white">No estoy seguro</span>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            Necesito más información
                          </p>
                        </button>
                      </div>
                      <textarea
                        value={paymentComment}
                        onChange={(e) => setPaymentComment(e.target.value)}
                        placeholder="¿Cuánto estarías dispuesto a pagar? (opcional)"
                        className="w-full h-20 p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => setStep(4)}
                          className="flex-1 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300"
                        >
                          Atrás
                        </button>
                        <button
                          onClick={handleSubmit}
                          disabled={loading || paymentPreference === null}
                          className="flex-1 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {loading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Enviando...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4" />
                              Enviar feedback
                            </>
                          )}
                        </button>
                      </div>
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
