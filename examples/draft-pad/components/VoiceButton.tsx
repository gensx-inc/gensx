import { Mic, Square } from "lucide-react";
import { motion } from "motion/react";

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
      onStopRecording();
    } else {
      onStartRecording();
    }
  };

  return (
    <motion.button
      onClick={handleClick}
      disabled={disabled || isTranscribing}
      className={`p-2 rounded-xl transition-all duration-200 cursor-pointer ${
        isRecording
          ? "bg-red-500/20 hover:bg-red-500/30 border border-red-500/50"
          : "bg-white/20 hover:bg-white/30 border border-white/30"
      } disabled:opacity-50 disabled:cursor-not-allowed`}
      whileHover={{ scale: disabled ? 1 : 1.05 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
    >
      {isRecording ? (
        <Square className="w-4 h-4 text-red-600 fill-current" />
      ) : (
        <Mic className="w-4 h-4 text-[#333333]" />
      )}
    </motion.button>
  );
}
