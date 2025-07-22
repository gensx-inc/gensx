"use client";

import { Mic, Square } from "lucide-react";

interface VoiceButtonProps {
  isRecording: boolean;
  isTranscribing: boolean;
  audioLevels?: number[];
  disabled?: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
}

export function VoiceButton({
  isRecording,
  isTranscribing,
  disabled = false,
  onStartRecording,
  onStopRecording,
}: VoiceButtonProps) {
  const handleClick = () => {
    if (isRecording) {
      onStopRecording();
    } else {
      onStartRecording();
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={disabled}
        className={`
          relative w-10 h-10 rounded-full transition-all duration-200
          ${
            disabled
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : isRecording
                ? "bg-red-500 text-white shadow-lg"
                : isTranscribing
                  ? "bg-blue-500 text-white shadow-lg"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }
          flex items-center justify-center
          ${isRecording ? "animate-pulse" : ""}
        `}
      >
        {/* Glass morphism overlay */}
        <div className="absolute inset-0 rounded-full bg-white/20 backdrop-blur-sm" />

        {/* Button content */}
        <div className="relative z-10 flex items-center justify-center">
          {isRecording ? (
            <Square className="w-4 h-4" />
          ) : (
            <Mic className="w-4 h-4" />
          )}
        </div>

        {/* Recording pulse animation */}
        {isRecording && (
          <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75" />
        )}
      </button>

      {/* Status text */}
      {isTranscribing && (
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
          <div className="text-xs text-slate-600 bg-white/80 backdrop-blur-sm px-2 py-1 rounded-md shadow-sm">
            Transcribing...
          </div>
        </div>
      )}
    </div>
  );
}
