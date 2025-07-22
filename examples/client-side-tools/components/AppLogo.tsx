"use client";

import { HelpCircle, MessageCircle } from "lucide-react";
import Image from "next/image";

interface AppLogoProps {
  onHelpClick: () => void;
  onChatToggle: () => void;
  showChatHistory: boolean;
  hasUnreadMessages?: boolean;
}

export function AppLogo({
  onHelpClick,
  onChatToggle,
  showChatHistory,
  hasUnreadMessages = false,
}: AppLogoProps) {
  return (
    <>
      {/* Desktop Layout */}
      <div className="hidden md:block fixed top-6 left-1/2 transform -translate-x-1/2 z-[9990]">
        <div className="flex items-center gap-4">
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
              {/* Unread messages indicator */}
              {hasUnreadMessages && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse" />
              )}
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
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-[9990] pt-safe-area">
        <div className="relative px-4 py-3 flex items-center justify-between backdrop-blur-[6px] bg-white/25 border-b border-white/40">
          {/* Glass morphism effect */}
          <div className="absolute inset-0 z-[1] shadow-[inset_2px_2px_3px_0_rgba(255,255,255,0.6),inset_-2px_-2px_3px_1px_rgba(255,255,255,0.3),inset_0_0_0_1px_rgba(255,255,255,0.2)]" />
          {/* Mobile Logo */}
          <div className="relative z-[2] flex items-center gap-2">
            <div className="w-6 h-6 flex items-center justify-center">
              <Image
                src="/gensx-map.svg"
                alt="GenSX Map"
                width={24}
                height={24}
                className="w-6 h-6"
              />
            </div>
            <div className="text-sm font-bold text-slate-900 drop-shadow-sm">
              GenSX Map
            </div>
          </div>

          {/* Mobile Action Buttons */}
          <div className="relative z-[2] flex items-center gap-2">
            {/* Chat Toggle Button */}
            <button
              onClick={onChatToggle}
              className={`relative rounded-xl overflow-hidden transition-all duration-200 active:scale-95 p-2.5 min-h-[44px] min-w-[44px] ${
                showChatHistory
                  ? "bg-green-500/20 text-green-800"
                  : "bg-white/40 text-slate-800"
              }`}
            >
              <MessageCircle className="w-5 h-5" />
              {/* Unread messages indicator */}
              {hasUnreadMessages && (
                <div className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse" />
              )}
            </button>

            {/* Help Button */}
            <button
              onClick={onHelpClick}
              className="relative rounded-xl overflow-hidden transition-all duration-200 active:scale-95 bg-white/40 text-slate-800 p-2.5 min-h-[44px] min-w-[44px]"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
