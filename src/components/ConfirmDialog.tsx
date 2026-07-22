import React, { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ConfirmOptions = {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
};

type PendingConfirm = ConfirmOptions & { resolve: (v: boolean) => void };

let pushConfirm: ((c: PendingConfirm) => void) | null = null;

export function confirmDialog(options: ConfirmOptions | string): Promise<boolean> {
  const opts: ConfirmOptions = typeof options === "string" ? { description: options } : options;
  return new Promise((resolve) => {
    if (!pushConfirm) {
      // Fallback if provider not mounted
      resolve(typeof window !== "undefined" ? window.confirm(opts.description || opts.title || "¿Confirmar?") : false);
      return;
    }
    pushConfirm({ ...opts, resolve });
  });
}

export function ConfirmDialogHost() {
  const [queue, setQueue] = useState<PendingConfirm[]>([]);
  const current = queue[0];

  useEffect(() => {
    pushConfirm = (c) => setQueue((q) => [...q, c]);
    return () => {
      pushConfirm = null;
    };
  }, []);

  const resolveAndPop = (value: boolean) => {
    if (current) current.resolve(value);
    setQueue((q) => q.slice(1));
  };

  return (
    <AlertDialog open={!!current} onOpenChange={(open) => { if (!open) resolveAndPop(false); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{current?.title || "Confirmar acción"}</AlertDialogTitle>
          {current?.description && (
            <AlertDialogDescription>{current.description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => resolveAndPop(false)}>
            {current?.cancelText || "Cancelar"}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => resolveAndPop(true)}
            className={current?.destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : undefined}
          >
            {current?.confirmText || "Confirmar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}