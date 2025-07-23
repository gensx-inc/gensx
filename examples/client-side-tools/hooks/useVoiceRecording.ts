import { useCallback, useRef, useState } from "react";
import { addToast } from "@/components/ui/toast";

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
      if (!navigator?.mediaDevices?.getUserMedia) {
        console.error("MediaDevices API is not supported in this environment");
        addToast({
          type: "error",
          title: "Voice Recording Not Supported",
          description:
            "Your browser doesn't support voice recording. Please try using a modern browser like Chrome, Firefox, or Safari.",
        });
        return;
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

      const animate = () => {
        if (!isRecordingRef.current) return;

        const currentTime = Date.now();
        const deltaTime = currentTime - lastFrameTime;

        if (deltaTime >= 16) {
          // Smooth transitions at 60fps
          const newLevels = previousLevels.map((prev) => {
            const random = Math.random() * 0.8 + 0.2; // Between 0.2 and 1.0
            const lerp = prev + (random - prev) * 0.15; // Smooth interpolation
            return Math.max(0.1, Math.min(1.0, lerp));
          });

          setState((prev) => ({
            ...prev,
            audioLevels: newLevels,
          }));

          previousLevels = newLevels;
          lastFrameTime = currentTime;
        }

        animationFrameRef.current = requestAnimationFrame(animate);
      };

      animate();

      // Set up MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      setState((prev) => ({ ...prev, isRecording: true }));
      mediaRecorder.start(100); // Collect data every 100ms
    } catch (error) {
      console.error("Failed to start recording:", error);
      setState((prev) => ({
        ...prev,
        error:
          error instanceof Error ? error.message : "Failed to start recording",
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

          const response = await fetch("/api/transcribe", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            throw new Error(`Transcription API error: ${response.status}`);
          }

          const result = await response.json();

          if (!result.success || !result.text) {
            throw new Error("Invalid transcription response");
          }

          setState((prev) => ({
            ...prev,
            isTranscribing: false,
            transcription: result.text.trim(),
          }));

          resolve();
        } catch (error) {
          console.error("Transcription error:", error);
          setState((prev) => ({
            ...prev,
            isTranscribing: false,
            error:
              error instanceof Error ? error.message : "Transcription failed",
          }));
          resolve();
        }
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
