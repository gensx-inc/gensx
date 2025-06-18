"use client";

import { ChevronDown } from "lucide-react";
import * as React from "react";

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}

interface SelectTriggerProps {
  className?: string;
  children: React.ReactNode;
}

interface SelectValueProps {
  placeholder?: string;
}

interface SelectContentProps {
  children: React.ReactNode;
}

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
}

const SelectContext = React.createContext<{
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  disabled?: boolean;
  items: Map<string, string>;
}>({
  value: "",
  onValueChange: () => {
    /* noop */
  },
  open: false,
  setOpen: () => {
    /* noop */
  },
  items: new Map(),
});

export function Select({
  value,
  onValueChange,
  disabled,
  children,
}: SelectProps) {
  const [open, setOpen] = React.useState(false);
  const [items] = React.useState(new Map<string, string>());

  return (
    <SelectContext.Provider
      value={{ value, onValueChange, open, setOpen, disabled, items }}
    >
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({
  className = "",
  children,
}: SelectTriggerProps) {
  const { open, setOpen, disabled } = React.useContext(SelectContext);

  return (
    <button
      type="button"
      onClick={() => {
        if (!disabled) {
          setOpen(!open);
        }
      }}
      className={`
        relative flex h-10 w-full items-center justify-between
        rounded-2xl px-3 py-2 text-sm
        bg-white/20 backdrop-blur-[3px]
        shadow-[0_4px_6px_rgba(0,0,0,0.1),inset_1px_1px_1px_0_rgba(255,255,255,0.3),inset_-1px_-1px_1px_0_rgba(255,255,255,0.3)]
        hover:shadow-[0_6px_8px_rgba(0,0,0,0.15),inset_1px_1px_1px_0_rgba(255,255,255,0.4),inset_-1px_-1px_1px_0_rgba(255,255,255,0.4)]
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-transparent
        disabled:cursor-not-allowed disabled:opacity-50
        ${className}
      `}
      disabled={disabled}
    >
      {children}
      <ChevronDown
        className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      />
    </button>
  );
}

export function SelectValue({ placeholder }: SelectValueProps) {
  const { value, items } = React.useContext(SelectContext);
  const displayValue = value ? (items.get(value) ?? value) : "";

  return (
    <span className={!value ? "text-[#333333]/60" : "text-[#333333]"}>
      {(displayValue || placeholder) ?? "Select..."}
    </span>
  );
}

export function SelectContent({ children }: SelectContentProps) {
  const { open, setOpen } = React.useContext(SelectContext);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={() => {
          setOpen(false);
        }}
      />
      <div
        className="
        absolute z-50 mt-2 w-full
        overflow-hidden
        rounded-2xl
        animate-in fade-in-0 zoom-in-95 duration-200
      "
      >
        {/* Glass container with stronger effect */}
        <div
          className="
          bg-white/40 backdrop-blur-[12px]
          shadow-[0_8px_32px_rgba(0,0,0,0.2),inset_1px_1px_2px_0_rgba(255,255,255,0.6)]
          border border-white/30
          max-h-60 overflow-auto
          py-1
        "
        >
          {children}
        </div>
      </div>
    </>
  );
}

export function SelectItem({ value, children }: SelectItemProps) {
  const context = React.useContext(SelectContext);
  const isSelected = context.value === value;

  // Register item in the map for display
  React.useEffect(() => {
    if (typeof children === "string") {
      context.items.set(value, children);
    }
    return () => {
      context.items.delete(value);
    };
  }, [value, children, context.items]);

  const handleClick = () => {
    context.onValueChange(value);
    context.setOpen(false);
  };

  return (
    <div
      className={`
        mx-1 px-3 py-2 text-sm cursor-pointer transition-all duration-150
        rounded-xl
        ${
          isSelected
            ? "bg-white/60 font-medium text-blue-600 shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]"
            : "text-[#333333] hover:bg-white/30 hover:backdrop-blur-[6px]"
        }
      `}
      onClick={handleClick}
    >
      {children}
    </div>
  );
}
