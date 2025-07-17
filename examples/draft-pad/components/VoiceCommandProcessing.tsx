"use client";

import { Brain, Zap } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

interface VoiceCommandProcessingProps {
  isProcessing: boolean;
  className?: string;
}

export function VoiceCommandProcessing({
  isProcessing,
  className = "",
}: VoiceCommandProcessingProps) {
  const [processingLevels, setProcessingLevels] = useState([
    0.3, 0.5, 0.7, 0.4, 0.6, 0.3, 0.5,
  ]);
  const animationFrameRef = useRef<number | null>(null);
  const previousLevelsRef = useRef([0.3, 0.5, 0.7, 0.4, 0.6, 0.3, 0.5]);
  const lastFrameTimeRef = useRef(Date.now());

  useEffect(() => {
    if (isProcessing) {
      const animateProcessingLevels = () => {
        const currentTime = Date.now();
        const deltaTime = currentTime - lastFrameTimeRef.current;
        lastFrameTimeRef.current = currentTime;

        // Generate smooth, brain-like processing levels
        const levels: number[] = [];
        for (let i = 0; i < 7; i++) {
          // Create pulsing wave pattern that simulates thinking
          const baseWave = Math.sin(currentTime / 300 + i * 0.8) * 0.3 + 0.5;
          const secondaryWave = Math.sin(currentTime / 150 + i * 1.2) * 0.2;
          const targetLevel = Math.max(
            0.2,
            Math.min(0.9, baseWave + secondaryWave),
          );

          // Smooth transition from previous level
          const smoothingFactor = Math.min(deltaTime / 80, 1);
          const currentLevel =
            previousLevelsRef.current[i] +
            (targetLevel - previousLevelsRef.current[i]) *
              smoothingFactor *
              0.4;

          levels.push(currentLevel);
        }

        previousLevelsRef.current = levels;
        setProcessingLevels(levels);

        animationFrameRef.current = requestAnimationFrame(
          animateProcessingLevels,
        );
      };

      animateProcessingLevels();

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }
  }, [isProcessing]);

  if (!isProcessing) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      className={`flex items-center gap-3 ${className}`}
    >
      {/* Animated thinking icon */}
      <div className="relative">
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.7, 1, 0.7],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <Brain className="w-5 h-5 text-blue-600" />
        </motion.div>

        {/* Subtle glow effect */}
        <motion.div
          className="absolute inset-0 rounded-full bg-blue-500"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0, 0.2, 0],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Processing visualization bars */}
      <div className="flex items-end gap-1">
        {processingLevels.map((level, index) => {
          const height = 8 + level * 16; // 8-24px height range

          return (
            <div
              key={index}
              className="w-1 bg-blue-500 rounded-full transition-all duration-150 ease-in-out"
              style={{
                height: `${height}px`,
                opacity: 0.6 + level * 0.4,
                boxShadow:
                  level > 0.6
                    ? `0 0 ${level * 4}px rgba(59, 130, 246, 0.4)`
                    : "none",
              }}
            />
          );
        })}
      </div>

      {/* Processing text with subtle animation */}
      <motion.div
        className="flex items-center gap-1.5"
        animate={{
          opacity: [0.7, 1, 0.7],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <span className="text-sm font-medium text-blue-700">
          Processing command
        </span>

        {/* Lightning bolt icon for speed */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 5, 0],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <Zap className="w-3 h-3 text-blue-600 fill-current" />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
