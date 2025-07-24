"use client";

import { MessageCircle } from "lucide-react";
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
          {/* GitHub Button */}
          <a
            href="https://github.com/dan-kfm/gensx"
            target="_blank"
            rel="noopener noreferrer"
            className="relative rounded-2xl overflow-hidden shadow-[0_8px_8px_rgba(0,0,0,0.25),0_0_25px_rgba(0,0,0,0.15)] transition-all duration-200 hover:scale-105 backdrop-blur-[6px] bg-white/50 hover:bg-white/60 border border-white/60 block"
          >
            <div className="absolute inset-0 z-[1] overflow-hidden rounded-2xl shadow-[inset_2px_2px_3px_0_rgba(255,255,255,0.6),inset_-2px_-2px_3px_1px_rgba(255,255,255,0.3),inset_0_0_0_1px_rgba(255,255,255,0.2)]" />

            <div className="relative z-[2] p-3">
              <svg
                className="w-5 h-5 text-slate-800"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </a>

          {/* Logo */}
          <button
            onClick={onHelpClick}
            className="relative rounded-3xl overflow-hidden shadow-[0_8px_8px_rgba(0,0,0,0.25),0_0_25px_rgba(0,0,0,0.15)] transition-all duration-400 ease-out backdrop-blur-[6px] bg-white/40 border border-white/60 hover:bg-white/50 cursor-pointer"
          >
            <div className="absolute inset-0 z-[1] overflow-hidden rounded-3xl shadow-[inset_2px_2px_3px_0_rgba(255,255,255,0.6),inset_-2px_-2px_3px_1px_rgba(255,255,255,0.3),inset_0_0_0_1px_rgba(255,255,255,0.2)]" />

            <div className="relative z-[2] px-4 py-2 flex items-center gap-2">
              <div className="w-8 h-8 flex items-center justify-center">
                <Image
                  src="/gensx-map.svg"
                  alt="ZapMap"
                  width={48}
                  height={48}
                  className="w-8 h-8"
                />
              </div>
              <div className="text-2xl font-bold text-slate-900 drop-shadow-sm font-gugi">
                ZapMap
              </div>
            </div>
          </button>

          {/* Chat Toggle Button */}
          <button
            onClick={onChatToggle}
            className={`relative rounded-2xl overflow-hidden shadow-[0_8px_8px_rgba(0,0,0,0.25),0_0_25px_rgba(0,0,0,0.15)] transition-all duration-200 hover:scale-105 backdrop-blur-[6px] border border-white/60 ${
              showChatHistory
                ? "bg-green-500/40 hover:bg-green-500/50"
                : "bg-white/50 hover:bg-white/60"
            }`}
          >
            <div className="absolute inset-0 z-[1] overflow-hidden rounded-2xl shadow-[inset_2px_2px_3px_0_rgba(255,255,255,0.6),inset_-2px_-2px_3px_1px_rgba(255,255,255,0.3),inset_0_0_0_1px_rgba(255,255,255,0.2)]" />

            <div className="relative z-[2] p-3">
              <MessageCircle
                className={`w-5 h-5 ${showChatHistory ? "text-green-800" : "text-slate-800"}`}
              />
              {/* Unread messages indicator */}
              {hasUnreadMessages && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse" />
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-[9990] pt-safe-area">
        <div className="relative px-4 py-3 flex items-center justify-between backdrop-blur-[6px] bg-white/40 border-b border-white/60">
          {/* Glass morphism effect */}
          <div className="absolute inset-0 z-[1] shadow-[inset_2px_2px_3px_0_rgba(255,255,255,0.6),inset_-2px_-2px_3px_1px_rgba(255,255,255,0.3),inset_0_0_0_1px_rgba(255,255,255,0.2)]" />
          {/* Mobile Logo */}
          <button
            onClick={onHelpClick}
            className="relative z-[2] flex items-center gap-2 hover:opacity-80 transition-opacity duration-200"
          >
            <div className="w-6 h-6 flex items-center justify-center">
              <Image
                src="/gensx-map.svg"
                alt="ZapMap"
                width={24}
                height={24}
                className="w-6 h-6"
              />
            </div>
            <div className="text-sm font-bold text-slate-900 drop-shadow-sm font-gugi">
              ZapMap
            </div>
          </button>

          {/* Mobile Action Buttons */}
          <div className="relative z-[2] flex items-center gap-2">
            {/* GitHub Button */}
            <a
              href="https://github.com/dan-kfm/gensx"
              target="_blank"
              rel="noopener noreferrer"
              className="relative rounded-xl overflow-hidden transition-all duration-200 active:scale-95 bg-white/60 text-slate-800 p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  clipRule="evenodd"
                />
              </svg>
            </a>

            {/* Chat Toggle Button */}
            <button
              onClick={onChatToggle}
              className={`relative rounded-xl overflow-hidden transition-all duration-200 active:scale-95 p-2.5 min-h-[44px] min-w-[44px] ${
                showChatHistory
                  ? "bg-green-500/30 text-green-800"
                  : "bg-white/60 text-slate-800"
              }`}
            >
              <MessageCircle className="w-5 h-5" />
              {/* Unread messages indicator */}
              {hasUnreadMessages && (
                <div className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse" />
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
