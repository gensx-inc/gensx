"use client";

import { HelpCircle, MessageCircle } from "lucide-react";
import Image from "next/image";

interface AppLogoProps {
  onHelpClick: () => void;
  onChatToggle: () => void;
  showChatHistory: boolean;
}

export function AppLogo({
  onHelpClick,
  onChatToggle,
  showChatHistory,
}: AppLogoProps) {
  return (
    <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[9990] flex items-center gap-4">
      {/* Logo */}
      <div className="relative rounded-3xl overflow-hidden shadow-[0_8px_8px_rgba(0,0,0,0.25),0_0_25px_rgba(0,0,0,0.15)] transition-all duration-400 ease-out backdrop-blur-[6px] bg-white/25 border border-white/40">
        <div className="absolute inset-0 z-[1] overflow-hidden rounded-3xl shadow-[inset_2px_2px_3px_0_rgba(255,255,255,0.6),inset_-2px_-2px_3px_1px_rgba(255,255,255,0.3),inset_0_0_0_1px_rgba(255,255,255,0.2)]" />

        <div className="relative z-[2] px-4 py-2 flex items-center gap-2">
          <div className="w-8 h-8 flex items-center justify-center">
            <Image
              src="/gensx-map.svg"
              alt="GenSX Map"
              width={48}
              height={48}
              className="w-8 h-8"
            />
          </div>
          <div className="text-lg font-bold text-slate-900 drop-shadow-sm">
            GenSX Map Explorer
          </div>
        </div>
      </div>

      {/* Chat Toggle Button */}
      <button
        onClick={onChatToggle}
        className={`relative rounded-2xl overflow-hidden shadow-[0_8px_8px_rgba(0,0,0,0.25),0_0_25px_rgba(0,0,0,0.15)] transition-all duration-200 hover:scale-105 backdrop-blur-[6px] border border-white/40 ${
          showChatHistory
            ? "bg-green-500/30 hover:bg-green-500/40"
            : "bg-white/25 hover:bg-white/35"
        }`}
      >
        <div className="absolute inset-0 z-[1] overflow-hidden rounded-2xl shadow-[inset_2px_2px_3px_0_rgba(255,255,255,0.6),inset_-2px_-2px_3px_1px_rgba(255,255,255,0.3),inset_0_0_0_1px_rgba(255,255,255,0.2)]" />

        <div className="relative z-[2] p-4">
          <MessageCircle
            className={`w-6 h-6 ${showChatHistory ? "text-green-800" : "text-slate-800"}`}
          />
        </div>
      </button>

      {/* Help Button */}
      <button
        onClick={onHelpClick}
        className="relative rounded-2xl overflow-hidden shadow-[0_8px_8px_rgba(0,0,0,0.25),0_0_25px_rgba(0,0,0,0.15)] transition-all duration-200 hover:scale-105 backdrop-blur-[6px] bg-white/25 hover:bg-white/35 border border-white/40"
      >
        <div className="absolute inset-0 z-[1] overflow-hidden rounded-2xl shadow-[inset_2px_2px_3px_0_rgba(255,255,255,0.6),inset_-2px_-2px_3px_1px_rgba(255,255,255,0.3),inset_0_0_0_1px_rgba(255,255,255,0.2)]" />

        <div className="relative z-[2] p-4">
          <HelpCircle className="w-6 h-6 text-slate-800" />
        </div>
      </button>
    </div>
  );
}
