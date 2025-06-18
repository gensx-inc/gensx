import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ProviderIcon } from "./provider-icon";

interface ProviderFilterProps {
  providers: string[];
  selectedProvider: string;
  onProviderChange: (provider: string) => void;
}

export function ProviderFilter({
  providers,
  selectedProvider,
  onProviderChange,
}: ProviderFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const getProviderDisplayName = (provider: string) => {
    if (provider === "all") return "All Providers";
    // Keep original casing - just return the provider name as-is
    return provider;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
        }}
        className="bg-white/40 backdrop-blur-md px-3 py-1.5 pr-8 rounded-full shadow-lg text-sm font-medium text-[#333333] cursor-pointer hover:bg-white/60 transition-all flex items-center gap-2"
      >
        {selectedProvider !== "all" && (
          <ProviderIcon provider={selectedProvider} className="w-4 h-4" />
        )}
        <span>{getProviderDisplayName(selectedProvider)}</span>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 bg-white/40 backdrop-blur-md rounded-lg shadow-lg overflow-hidden min-w-[180px] z-50 border border-white/30">
          <button
            onClick={() => {
              onProviderChange("all");
              setIsOpen(false);
            }}
            className={`w-full px-3 py-2 text-left text-sm font-medium transition-all flex items-center gap-2 text-[#333333] ${
              selectedProvider === "all" ? "bg-white/40" : "hover:bg-white/30"
            }`}
          >
            <div className="w-4 h-4" /> {/* Spacer for alignment */}
            <span>All Providers</span>
          </button>
          {providers.map((provider) => (
            <button
              key={provider}
              onClick={() => {
                onProviderChange(provider);
                setIsOpen(false);
              }}
              className={`w-full px-3 py-2 text-left text-sm font-medium transition-all flex items-center gap-2 text-[#333333] ${
                selectedProvider === provider
                  ? "bg-white/40"
                  : "hover:bg-white/30"
              }`}
            >
              <ProviderIcon provider={provider} className="w-4 h-4" />
              <span>{getProviderDisplayName(provider)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
