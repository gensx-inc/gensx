import { motion } from "motion/react";

interface VoiceVisualizationProps {
  isRecording: boolean;
  isTranscribing: boolean;
}

export function VoiceVisualization({
  isRecording,
  isTranscribing,
}: VoiceVisualizationProps) {
  if (isTranscribing) {
    return (
      <div className="flex items-center justify-center h-12 px-4">
        <div className="flex items-center gap-2">
          <motion.div
            className="w-4 h-4 bg-blue-500 rounded-full"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <span className="text-sm text-[#333333]/70">Transcribing...</span>
        </div>
      </div>
    );
  }

  if (isRecording) {
    return (
      <div className="flex items-center justify-center h-12 px-4">
        <div className="flex items-center gap-3">
          <div className="flex items-end gap-1 h-6">
            {Array.from({ length: 5 }).map((_, index) => (
              <motion.div
                key={index}
                className="w-1 bg-red-500 rounded-full"
                animate={{
                  height: ["8px", "20px", "8px"],
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: index * 0.1,
                }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm text-[#333333]/70">Recording...</span>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
