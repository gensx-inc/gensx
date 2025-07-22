"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { X, CheckCircle, Clock, AlertCircle } from "lucide-react";

export interface Toast {
  id: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  description?: string;
  duration?: number;
  autoHide?: boolean;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => string;
  removeToast: (id: string) => void;
  updateToast: (id: string, updates: Partial<Toast>) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

let toastCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = `toast-${Date.now()}-${++toastCounter}`;
    const newToast: Toast = {
      id,
      autoHide: true,
      duration: 4000,
      ...toast,
    };

    setToasts((prev) => [...prev, newToast]);

    if (newToast.autoHide && newToast.duration) {
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const updateToast = useCallback((id: string, updates: Partial<Toast>) => {
    setToasts((prev) =>
      prev.map((toast) => (toast.id === id ? { ...toast, ...updates } : toast)),
    );
  }, []);

  return (
    <ToastContext.Provider
      value={{ toasts, addToast, removeToast, updateToast }}
    >
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-2 right-6 z-[9997] space-y-2 w-full max-w-sm">
      {toasts.map((toast) => (
        <ToastComponent
          key={toast.id}
          toast={toast}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}

function ToastComponent({
  toast,
  onClose,
}: {
  toast: Toast;
  onClose: () => void;
}) {
  const getIcon = () => {
    switch (toast.type) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case "warning":
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Clock className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className="relative rounded-2xl overflow-hidden shadow-[0_8px_8px_rgba(0,0,0,0.25),0_0_25px_rgba(0,0,0,0.15)] transition-all duration-300 animate-in slide-in-from-bottom-2 backdrop-blur-[6px] bg-white/25 border border-white/40">
      <div className="absolute inset-0 z-[1] overflow-hidden rounded-2xl shadow-[inset_2px_2px_3px_0_rgba(255,255,255,0.6),inset_-2px_-2px_3px_1px_rgba(255,255,255,0.3),inset_0_0_0_1px_rgba(255,255,255,0.2)]" />
      <div className="relative z-[2] p-4">
        <div className="flex items-start gap-3">
          {getIcon()}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-slate-900">
              {toast.title}
            </div>
            {toast.description && (
              <div className="text-sm text-slate-600 mt-1">
                {toast.description}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1 rounded-md hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>
    </div>
  );
}
