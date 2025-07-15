import { Mic, Square } from "lucide-react";

interface VoiceButtonProps {
  isRecording: boolean;
  isTranscribing: boolean;
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
      // Stop immediately without waiting for animations
      onStopRecording();
    } else {
      onStartRecording();
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isTranscribing}
      className={`p-2 rounded-xl transition-colors duration-150 ${
        isRecording
          ? "bg-red-500/20 hover:bg-red-500/30 border border-red-500/50"
          : "bg-white/20 hover:bg-white/30 border border-white/30"
      } disabled:opacity-50 disabled:cursor-not-allowed ${
        !disabled && !isTranscribing ? "cursor-pointer active:scale-95" : ""
      }`}
    >
      {isRecording ? (
        <Square className="w-4 h-4 text-red-600 fill-current" />
      ) : (
        <Mic className="w-4 h-4 text-[#333333]" />
      )}
    </button>
  );
}
