"use client";

import { useEffect, useRef, useState } from "react";

interface VoiceVisualizationProps {
  audioLevels: number[];
  isRecording: boolean;
  isTranscribing: boolean;
  error: string | null;
  isExpanded?: boolean;
}

export function VoiceVisualization({
  audioLevels,
  isRecording,
  isTranscribing,
  error,
  isExpanded = false,
}: VoiceVisualizationProps) {
  const [transcribingLevels, setTranscribingLevels] = useState([
    0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2,
  ]);
  const animationFrameRef = useRef<number | null>(null);
  const previousLevelsRef = useRef([0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2]);
  const lastFrameTimeRef = useRef(Date.now());

  useEffect(() => {
    if (isTranscribing) {
      const animateTranscribingLevels = () => {
        const currentTime = Date.now();
        const deltaTime = currentTime - lastFrameTimeRef.current;
        lastFrameTimeRef.current = currentTime;

        // Generate smooth random levels for each bar
        const levels: number[] = [];
        for (let i = 0; i < 7; i++) {
          // Target level with some randomness
          const targetLevel = 0.2 + Math.random() * 0.6;

          // Smooth transition from previous level
          const smoothingFactor = Math.min(deltaTime / 100, 1);
          const currentLevel =
            previousLevelsRef.current[i] +
            (targetLevel - previousLevelsRef.current[i]) *
              smoothingFactor *
              0.3;

          // Add slight wave effect based on index and time
          const wave = Math.sin(currentTime / 200 + i * 0.5) * 0.1;

          levels.push(Math.max(0.1, Math.min(0.9, currentLevel + wave)));
        }

        previousLevelsRef.current = levels;
        setTranscribingLevels(levels);

        animationFrameRef.current = requestAnimationFrame(
          animateTranscribingLevels,
        );
      };

      animateTranscribingLevels();

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }
  }, [isTranscribing]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-24 py-4">
        <span className="text-sm text-red-500">{error}</span>
      </div>
    );
  }

  if (isTranscribing) {
    return (
      <div
        className={`flex items-center justify-center ${isExpanded ? "h-32" : "h-24 py-4"}`}
      >
        <div className="flex items-end justify-center gap-1.5 h-full">
          {transcribingLevels.map((level, index) => {
            const minHeight = isExpanded ? 8 : 12;
            const maxHeight = isExpanded ? 48 : 40;
            const height = Math.max(
              minHeight,
              minHeight + (maxHeight - minHeight) * level,
            );

            return (
              <div
                key={index}
                className={`${isExpanded ? "w-2" : "w-1.5"} bg-blue-500 rounded-full transition-all duration-200 ease-in-out`}
                style={{
                  height: `${height}px`,
                  opacity: 0.6 + level * 0.4,
                  transform: `scaleY(${0.9 + level * 0.1})`,
                  boxShadow:
                    level > 0.4
                      ? `0 0 ${level * 8}px rgba(59, 130, 246, 0.4)`
                      : "none",
                }}
              />
            );
          })}
        </div>
      </div>
    );
  }

  if (isRecording) {
    return (
      <div
        className={`flex items-center justify-center ${isExpanded ? "h-32" : "h-24 py-4"}`}
      >
        <div className="flex items-end justify-center gap-1.5 h-full">
          {audioLevels.map((level, index) => {
            const minHeight = isExpanded ? 8 : 12;
            const maxHeight = isExpanded ? 48 : 40;
            const height = Math.max(
              minHeight,
              minHeight + (maxHeight - minHeight) * level,
            );

            return (
              <div
                key={index}
                className={`${isExpanded ? "w-2" : "w-1.5"} bg-red-500 rounded-full transition-all duration-200 ease-in-out`}
                style={{
                  height: `${height}px`,
                  opacity: 0.6 + level * 0.4,
                  transform: `scaleY(${0.9 + level * 0.1})`,
                  boxShadow:
                    level > 0.4
                      ? `0 0 ${level * 8}px rgba(239, 68, 68, 0.4)`
                      : "none",
                }}
              />
            );
          })}
        </div>
      </div>
    );
  }

  return null;
}
