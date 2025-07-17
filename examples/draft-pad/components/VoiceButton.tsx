import { Mic, Square } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

interface VoiceButtonProps {
  isRecording: boolean;
  isTranscribing: boolean;
  isProcessingCommand?: boolean;
  commandFeedback?: string | null;
  audioLevels?: number[];
  disabled?: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
}

export function VoiceButton({
  isRecording,
  isTranscribing,
  isProcessingCommand = false,
  commandFeedback = null,
  audioLevels = [0.2, 0.2, 0.2, 0.2, 0.2],
  disabled: _disabled = false,
  onStartRecording,
  onStopRecording,
}: VoiceButtonProps) {
  const [animatedLevels, setAnimatedLevels] = useState([
    0.2, 0.2, 0.2, 0.2, 0.2,
  ]);
  const animationFrameRef = useRef<number | null>(null);
  const previousLevelsRef = useRef([0.2, 0.2, 0.2, 0.2, 0.2]);
  const lastFrameTimeRef = useRef(Date.now());

  const handleClick = () => {
    if (isRecording) {
      // Stop immediately without waiting for animations
      onStopRecording();
    } else {
      onStartRecording();
    }
  };

  const isVoiceActive = isRecording || isTranscribing || isProcessingCommand;
  const showingFeedback = commandFeedback && !isVoiceActive;

  // Animation for transcribing and processing states (not recording, that uses real audio levels)
  useEffect(() => {
    if (isTranscribing || isProcessingCommand || showingFeedback) {
      const animateVisualization = () => {
        const currentTime = Date.now();
        const deltaTime = currentTime - lastFrameTimeRef.current;
        lastFrameTimeRef.current = currentTime;

        const levels: number[] = [];
        for (let i = 0; i < 5; i++) {
          // Higher intensity for processing and feedback
          const baseIntensity =
            isProcessingCommand || showingFeedback ? 0.4 : 0.3;
          const targetLevel = baseIntensity + Math.random() * 0.5;

          // Smooth transition
          const smoothingFactor = Math.min(deltaTime / 100, 1);
          const currentLevel =
            previousLevelsRef.current[i] +
            (targetLevel - previousLevelsRef.current[i]) *
              smoothingFactor *
              0.4;

          // Wave effect
          const waveSpeed = isProcessingCommand || showingFeedback ? 120 : 180;
          const wave = Math.sin(currentTime / waveSpeed + i * 0.8) * 0.15;

          levels.push(Math.max(0.1, Math.min(0.9, currentLevel + wave)));
        }

        previousLevelsRef.current = levels;
        setAnimatedLevels(levels);

        animationFrameRef.current = requestAnimationFrame(animateVisualization);
      };

      animateVisualization();

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }
  }, [isTranscribing, isProcessingCommand, showingFeedback]);

  // Get current status badge info
  const getBadgeInfo = () => {
    if (isRecording) {
      return {
        text: "Recording...",
        bgColor: "bg-red-500/30",
        borderColor: "border-red-400/40",
        levels: audioLevels,
        barColor: "bg-red-600",
      };
    }
    if (isTranscribing) {
      return {
        text: "Transcribing with Whisper v3 Turbo from Groq",
        bgColor: "bg-blue-500/30",
        borderColor: "border-blue-400/40",
        levels: animatedLevels,
        barColor: "bg-blue-600",
      };
    }
    if (isProcessingCommand) {
      return {
        text: "Processing command with Kimi K2 from Groq",
        bgColor: "bg-green-500/30",
        borderColor: "border-green-400/40",
        levels: animatedLevels,
        barColor: "bg-green-600",
      };
    }
    if (showingFeedback) {
      return {
        text: commandFeedback || "",
        bgColor: "bg-green-500/30",
        borderColor: "border-green-400/40",
        levels: animatedLevels,
        barColor: "bg-green-600",
      };
    }
    return null;
  };

  const badgeInfo = getBadgeInfo();

  return (
    <div className="relative flex items-center">
      <button
        onClick={handleClick}
        disabled={isTranscribing}
        className={`relative p-4 rounded-2xl transition-all duration-200 ${
          isRecording
            ? "bg-red-500/30 hover:bg-red-500/40"
            : "bg-white/50 hover:bg-white/60 backdrop-blur-sm"
        } disabled:opacity-50 disabled:cursor-not-allowed ${
          !isTranscribing
            ? "cursor-pointer active:scale-95 hover:scale-105"
            : ""
        } shadow-[0_4px_24px_rgba(0,0,0,0.12),0_0_48px_rgba(0,0,0,0.08)] overflow-visible`}
      >
        {/* Inset border effect */}
        <div
          className={`absolute inset-0 rounded-2xl ${
            isRecording
              ? "shadow-[inset_1px_1px_1px_0_rgba(255,255,255,0.3),inset_-1px_-1px_1px_1px_rgba(255,255,255,0.3)]"
              : "shadow-[inset_1px_1px_1px_0_rgba(255,255,255,0.4),inset_-1px_-1px_1px_1px_rgba(255,255,255,0.4)]"
          }`}
        />

        {/* Icon - Microphone or Stop */}
        <div className="relative z-10 flex items-center justify-center min-w-[24px]">
          {isRecording ? (
            <Square className="w-6 h-6 text-red-600 fill-current" />
          ) : (
            <Mic className="w-6 h-6 text-[#333333]" />
          )}
        </div>
      </button>

      {/* Animated status badge with visualization */}
      <AnimatePresence>
        {badgeInfo && (
          <motion.div
            key={badgeInfo.text} // Use text as key to trigger re-animation on state changes
            initial={{ x: -20, opacity: 0, scale: 0.8 }}
            animate={{ x: 12, opacity: 1, scale: 1 }}
            exit={{ x: -20, opacity: 0, scale: 0.8 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 25,
              duration: 0.4,
            }}
            className="absolute left-full top-1/2 transform -translate-y-1/2 z-10"
          >
            <div
              className={`${badgeInfo.bgColor} backdrop-blur-xl text-white px-3 py-2 rounded-full shadow-xl ${badgeInfo.borderColor} border flex items-center gap-2`}
            >
              {/* Mini visualization bars - only show for active states, not final feedback */}
              {!showingFeedback && (
                <div className="flex items-end justify-center gap-0.5 h-4">
                  {badgeInfo.levels.map((level, index) => {
                    const height = Math.max(2, 2 + 10 * level);
                    return (
                      <div
                        key={index}
                        className={`w-0.5 ${badgeInfo.barColor} rounded-full transition-all duration-150 ease-in-out`}
                        style={{
                          height: `${height}px`,
                          opacity: 0.7 + level * 0.3,
                        }}
                      />
                    );
                  })}
                </div>
              )}

              {/* Status text */}
              <span className="text-xs font-medium whitespace-nowrap">
                {badgeInfo.text}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
