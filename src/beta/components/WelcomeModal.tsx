import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Rocket, Star, MessageSquare, Cloud, ArrowRight } from 'lucide-react';

interface WelcomeModalProps {
  open: boolean;
  userName?: string;
  onContinue: () => Promise<void>;
}

export function WelcomeModal({ open, userName, onContinue }: WelcomeModalProps) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-lg" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="text-center mb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mb-4">
              <Rocket className="w-8 h-8 text-white" />
            </div>
            <DialogTitle className="text-2xl">
              ¡Bienvenido{userName ? `, ${userName.split('@')[0]}` : ''}! 🎉
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="text-center text-slate-600 dark:text-slate-300 mb-6">
          <p>
            Gracias por unirte a la beta cerrada de <strong>Astroboard</strong>. 
            Tu feedback es esencial para hacer esta herramienta increíble.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Star className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h4 className="font-medium text-slate-900 dark:text-white">Acceso completo</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Tienes acceso a todas las funcionalidades de la app sin restricciones.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <Cloud className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h4 className="font-medium text-slate-900 dark:text-white">Almacenamiento en la nube</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Tus datos se guardan automáticamente. No necesitas exportar/importar JSON.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <MessageSquare className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h4 className="font-medium text-slate-900 dark:text-white">Tu opinión importa</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Usa el botón de feedback en cualquier momento para compartir tu experiencia.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onContinue}
          className="w-full mt-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium hover:from-blue-700 hover:to-purple-700 transition flex items-center justify-center gap-2"
        >
          Empezar a explorar
          <ArrowRight className="w-5 h-5" />
        </button>
      </DialogContent>
    </Dialog>
  );
}
