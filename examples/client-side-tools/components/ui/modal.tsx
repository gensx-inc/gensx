"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  className,
}: ModalProps) {
  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div
        className={cn(
          "relative w-full max-w-lg max-h-[90vh] overflow-hidden",
          className,
        )}
      >
        {/* Glass morphism modal */}
        <div className="relative rounded-3xl overflow-hidden shadow-[0_8px_8px_rgba(0,0,0,0.2),0_0_30px_rgba(0,0,0,0.1)] transition-all duration-400 ease-out backdrop-blur-[10px] bg-white/20">
          <div className="absolute inset-0 z-[1] overflow-hidden rounded-3xl shadow-[inset_2px_2px_2px_0_rgba(255,255,255,0.5),inset_-2px_-2px_2px_2px_rgba(255,255,255,0.3)]" />

          {/* Content */}
          <div className="relative z-[2] p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-800">{title}</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/20 transition-colors duration-200"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto max-h-[60vh]">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
