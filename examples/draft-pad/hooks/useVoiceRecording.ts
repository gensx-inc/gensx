import { getApiUrl } from "@/lib/config";
import { useCallback, useRef, useState } from "react";

interface VoiceRecordingState {
  isRecording: boolean;
  isTranscribing: boolean;
  error: string | null;
  transcription: string | null;
  audioLevels: number[]; // Array of audio levels for visualization
}

interface UseVoiceRecordingReturn extends VoiceRecordingState {
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  clearTranscription: () => void;
}

export function useVoiceRecording(): UseVoiceRecordingReturn {
  const [state, setState] = useState<VoiceRecordingState>({
    isRecording: false,
    isTranscribing: false,
    error: null,
    transcription: null,
    audioLevels: [0, 0, 0, 0, 0, 0, 0], // Initialize with 7 bars
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isRecordingRef = useRef(false);

  const startRecording = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, error: null, transcription: null }));

      // Check if MediaDevices API is available
      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices?.getUserMedia
      ) {
        throw new Error(
          "MediaDevices API is not supported in this environment",
        );
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      streamRef.current = stream;

      // Simple random animation instead of complex audio analysis
      isRecordingRef.current = true;

      // Store previous levels for smooth transitions
      let previousLevels = [0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2];
      let lastFrameTime = Date.now();

      // Start random animation for visual feedback
      const animateRandomLevels = () => {
        if (!isRecordingRef.current) return;

        const currentTime = Date.now();
        const deltaTime = currentTime - lastFrameTime;
        lastFrameTime = currentTime;

        // Generate smooth random levels for each bar
        const levels: number[] = [];
        for (let i = 0; i < 7; i++) {
          // Target level with some randomness
          const targetLevel = 0.2 + Math.random() * 0.6;

          // Smooth transition from previous level
          const smoothingFactor = Math.min(deltaTime / 100, 1); // Smoother transitions
          const currentLevel =
            previousLevels[i] +
            (targetLevel - previousLevels[i]) * smoothingFactor * 0.3;

          // Add slight wave effect based on index and time
          const wave = Math.sin(currentTime / 200 + i * 0.5) * 0.1;

          levels.push(Math.max(0.1, Math.min(0.9, currentLevel + wave)));
        }

        previousLevels = levels;

        // Update state with levels
        setState((prev) => ({ ...prev, audioLevels: levels }));

        // Continue animation
        animationFrameRef.current = requestAnimationFrame(animateRandomLevels);
      };

      const mediaRecorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();

      setState((prev) => ({ ...prev, isRecording: true }));

      // Start animation after a short delay
      setTimeout(() => {
        animateRandomLevels();
      }, 100);
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error:
          error instanceof Error ? error.message : "Failed to start recording",
        isRecording: false,
      }));
    }
  }, []);

  const stopRecording = useCallback(async () => {
    // Immediately update state for responsive UI
    isRecordingRef.current = false;

    // Stop animation frame immediately
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Reset audio levels immediately
    setState((prev) => ({
      ...prev,
      isRecording: false,
      isTranscribing: true,
      audioLevels: [0, 0, 0, 0, 0, 0, 0],
    }));

    if (
      !mediaRecorderRef.current ||
      mediaRecorderRef.current.state !== "recording"
    ) {
      return;
    }

    return new Promise<void>((resolve) => {
      const mediaRecorder = mediaRecorderRef.current!;

      mediaRecorder.onstop = async () => {
        try {
          // Stop stream tracks
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => {
              track.stop();
            });
            streamRef.current = null;
          }

          // Create audio blob
          const audioBlob = new Blob(audioChunksRef.current, {
            type: mediaRecorder.mimeType,
          });

          if (audioBlob.size === 0) {
            throw new Error("No audio data recorded");
          }

          // Send to transcription API
          const formData = new FormData();
          formData.append("audio", audioBlob, "recording.webm");

          const response = await fetch(getApiUrl("/api/transcribe"), {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            throw new Error(`Transcription API error: ${response.status}`);
          }

          const result = await response.json();

          if (result.success && result.text) {
            setState((prev) => ({
              ...prev,
              transcription: result.text.trim(),
              isTranscribing: false,
            }));
          } else {
            setState((prev) => ({
              ...prev,
              error: result.error ?? "Transcription failed",
              isTranscribing: false,
            }));
          }
        } catch (error) {
          setState((prev) => ({
            ...prev,
            error:
              error instanceof Error ? error.message : "Transcription failed",
            isTranscribing: false,
          }));
        }

        resolve();
      };

      mediaRecorder.stop();
    });
  }, []);

  const clearTranscription = useCallback(() => {
    setState((prev) => ({ ...prev, transcription: null, error: null }));
  }, []);

  return {
    ...state,
    startRecording,
    stopRecording,
    clearTranscription,
  };
}
