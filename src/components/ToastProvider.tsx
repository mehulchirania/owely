"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
export type ToastType = "success" | "error" | "info";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto dismiss after 3 seconds
    setTimeout(() => {
      removeToast(id);
    }, 3000);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      {/* Toast container */}
      <div className="pointer-events-none fixed bottom-[84px] left-0 right-0 z-50 flex flex-col items-center gap-2 px-4 sm:bottom-6">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`ow-toast pointer-events-auto flex items-center gap-3 rounded-full px-5 py-3 text-sm font-semibold shadow-xl backdrop-blur-md ${
              toast.type === "success"
                ? "bg-mint/15 text-mint border border-mint/20"
                : toast.type === "error"
                ? "bg-coral/15 text-coral border border-coral/20"
                : "bg-surface/90 text-hi border border-white/10"
            }`}
          >
            {toast.type === "success" && <span aria-hidden="true">✓</span>}
            {toast.type === "error" && <span aria-hidden="true">✕</span>}
            {toast.type === "info" && <span aria-hidden="true">ℹ</span>}
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
