"use client";

// Small hand-rolled toast system - a context that holds the current list
// of toasts, plus a hook any client component can call to push a new one.
// No external library for this on purpose, it's simple enough not to need one.

// Side-effect import: installs the per-tab session fetch patch as early as
// possible (see session-fetch.ts for why). ToastProvider wraps every page
// in the app from the root layout, so this runs before anything else does.
import "@/lib/session-fetch";

import { createContext, useCallback, useContext, useState } from "react";

type ToastVariant = "success" | "error" | "alert";

type Toast = {
  id: number;
  message: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  showToast: (message: string, variant?: ToastVariant) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, variant: ToastVariant = "success") => {
    const id = nextId++;
    setToasts((current) => [...current, { id, message, variant }]);

    // auto-dismiss after 3.5s so they don't pile up on screen
    setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-lg px-4 py-3 shadow-lg text-sm font-medium text-white animate-toast-in ${
              toast.variant === "success"
                ? "bg-emerald-600"
                : toast.variant === "alert"
                ? "bg-amber-500"
                : "bg-red-600"
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
