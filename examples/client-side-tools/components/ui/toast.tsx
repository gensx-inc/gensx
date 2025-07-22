"use client";

import { Toaster, toast } from "sonner";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";
import { useState } from "react";

export type ToastType = "success" | "error" | "info";

export interface ToastData {
  type: ToastType;
  title: string;
  description?: string;
  autoHide?: boolean;
}

// Custom toast component with glass morphism styling
function CustomToast({
  type,
  title,
  description,
  onClose,
}: ToastData & { onClose: () => void }) {
  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case "info":
        return <Info className="w-5 h-5 text-blue-600" />;
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  return (
    <div className="relative rounded-2xl overflow-hidden shadow-[0_8px_8px_rgba(0,0,0,0.25),0_0_25px_rgba(0,0,0,0.15)] transition-all duration-300 animate-in slide-in-from-bottom-2 backdrop-blur-[6px] bg-white/25 border border-white/40">
      <div className="absolute inset-0 z-[1] overflow-hidden rounded-2xl shadow-[inset_2px_2px_3px_0_rgba(255,255,255,0.6),inset_-2px_-2px_3px_1px_rgba(255,255,255,0.3),inset_0_0_0_1px_rgba(255,255,255,0.2)]" />
      <div className="relative z-[2] p-4">
        <div className="flex items-start gap-3">
          {getIcon()}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-slate-900">{title}</div>
            {description && (
              <div className="text-sm text-slate-600 mt-1">{description}</div>
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

// Toast functions
export const addToast = (data: ToastData) => {
  const toastId = toast.custom(
    (t) => <CustomToast {...data} onClose={() => toast.dismiss(t)} />,
    {
      duration: data.autoHide === false ? Infinity : 4000,
    },
  );
  return toastId;
};

// Clear all toasts
export const clearAllToasts = () => {
  toast.dismiss();
};

// Toaster component with hover-to-expand functionality
export function ToastContainer() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="fixed bottom-2 right-6 z-[9997]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Toaster
        position="bottom-right"
        offset="0px" // We're handling positioning with the wrapper div
        visibleToasts={isHovered ? 15 : 3} // Show 3 normally, 15 on hover
        toastOptions={{
          unstyled: true,
          classNames: {
            toast: "w-80",
          },
        }}
        style={{
          position: "relative",
          bottom: "auto",
          right: "auto",
        }}
      />
    </div>
  );
}
