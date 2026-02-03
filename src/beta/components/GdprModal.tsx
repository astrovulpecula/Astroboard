import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Shield, Check, Loader2 } from 'lucide-react';

interface GdprModalProps {
  open: boolean;
  onAccept: () => Promise<void>;
}

export function GdprModal({ open, onAccept }: GdprModalProps) {
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    if (!checked) return;
    setLoading(true);
    await onAccept();
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/30">
              <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <DialogTitle className="text-xl">Política de Privacidad</DialogTitle>
          </div>
          <DialogDescription>
            Antes de continuar, por favor lee y acepta nuestra política de protección de datos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
          <section>
            <h4 className="font-semibold text-slate-900 dark:text-white mb-2">
              1. Datos que recopilamos
            </h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>Email de registro</li>
              <li>Datos de uso anónimos (secciones visitadas, acciones realizadas)</li>
              <li>Feedback que nos proporciones voluntariamente</li>
              <li>Datos astronómicos que subas a la plataforma</li>
            </ul>
          </section>

          <section>
            <h4 className="font-semibold text-slate-900 dark:text-white mb-2">
              2. Propósito del tratamiento
            </h4>
            <p>
              Los datos se utilizan exclusivamente para:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Mejorar la aplicación durante el período de beta</li>
              <li>Identificar errores y problemas de usabilidad</li>
              <li>Entender qué funcionalidades son más útiles</li>
              <li>Comunicarnos contigo sobre actualizaciones importantes</li>
            </ul>
          </section>

          <section>
            <h4 className="font-semibold text-slate-900 dark:text-white mb-2">
              3. Período de retención
            </h4>
            <p>
              Todos los datos recopilados durante la beta serán eliminados al finalizar el período de prueba.
            </p>
          </section>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              He leído y acepto la política de privacidad. Entiendo cómo se usarán mis datos 
              durante el período de beta.
            </span>
          </label>

          <button
            onClick={handleAccept}
            disabled={!checked || loading}
            className="w-full mt-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium hover:bg-slate-800 dark:hover:bg-slate-100 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                Aceptar y continuar
              </>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
