import { useCallback, useRef, useState } from "react";

interface VoiceRecordingState {
  isRecording: boolean;
  isTranscribing: boolean;
  error: string | null;
  transcription: string | null;
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
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, error: null, transcription: null }));

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      streamRef.current = stream;
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
    if (
      !mediaRecorderRef.current ||
      mediaRecorderRef.current.state !== "recording"
    ) {
      return;
    }

    setState((prev) => ({ ...prev, isRecording: false, isTranscribing: true }));

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
