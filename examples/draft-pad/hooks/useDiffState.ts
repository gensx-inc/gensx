"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useDiffState() {
  const [showDiff, setShowDiff] = useState(false);
  const [autoShowDiff, setAutoShowDiff] = useState(false);
  const [isManuallyHiding, setIsManuallyHiding] = useState(false);
  const autoHideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const showDiffRef = useRef(showDiff);

  // Keep ref in sync with state
  useEffect(() => {
    showDiffRef.current = showDiff;
  }, [showDiff]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoHideTimerRef.current) {
        clearTimeout(autoHideTimerRef.current);
      }
    };
  }, []);

  const isDiffVisible = showDiff || autoShowDiff;

  const toggleDiff = useCallback(() => {
    // Clear any auto-hide timer
    if (autoHideTimerRef.current) {
      clearTimeout(autoHideTimerRef.current);
      autoHideTimerRef.current = null;
    }

    // If manually showing, trigger hide animation
    if (showDiff) {
      setIsManuallyHiding(true);
      setShowDiff(false); // Set immediately for responsive UI
      setAutoShowDiff(false);
      // Reset hiding flag after animation completes
      setTimeout(() => {
        setIsManuallyHiding(false);
      }, 2500);
    } else {
      // Otherwise, show it manually (no animation needed)
      setShowDiff(true);
      setAutoShowDiff(false);
      setIsManuallyHiding(false);
    }
  }, [showDiff]);

  const showAutoCompletion = useCallback(() => {
    if (!showDiff) {
      setAutoShowDiff(true);

      // Clear any existing timer
      if (autoHideTimerRef.current) {
        clearTimeout(autoHideTimerRef.current);
      }

      // Hide after 3 seconds (but only if manual diff is not enabled)
      autoHideTimerRef.current = setTimeout(() => {
        // Only hide auto diff if manual diff is not enabled
        if (!showDiffRef.current) {
          setAutoShowDiff(false);
        }
        autoHideTimerRef.current = null;
      }, 3000);
    }
  }, [showDiff]);

  const resetDiff = useCallback(() => {
    // Clear any existing timer
    if (autoHideTimerRef.current) {
      clearTimeout(autoHideTimerRef.current);
      autoHideTimerRef.current = null;
    }
    setAutoShowDiff(false);
  }, []);

  return {
    showDiff,
    autoShowDiff,
    isManuallyHiding,
    isDiffVisible,
    toggleDiff,
    showAutoCompletion,
    resetDiff,
  };
}
