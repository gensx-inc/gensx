import { useState, useEffect } from "react";

interface ViewportState {
  viewport: {
    width: number;
    height: number;
  };
  visualViewport: {
    width: number;
    height: number;
  };
}

const getViewports = (): ViewportState => ({
  viewport: {
    width: Math.max(
      document.documentElement.clientWidth || 0,
      window.innerWidth || 0,
    ),
    height: Math.max(
      document.documentElement.clientHeight || 0,
      window.innerHeight || 0,
    ),
  },
  visualViewport: {
    width: window.visualViewport?.width || window.innerWidth || 0,
    height: window.visualViewport?.height || window.innerHeight || 0,
  },
});

export const useVisualViewport = () => {
  const [state, setState] = useState<ViewportState | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Initial state
    setState(getViewports());

    const handleResize = () => setState(getViewports());

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleResize);
      return () => {
        window.visualViewport?.removeEventListener("resize", handleResize);
      };
    } else {
      // Fallback for browsers without visualViewport support
      window.addEventListener("resize", handleResize);
      return () => {
        window.removeEventListener("resize", handleResize);
      };
    }
  }, []);

  return state;
};

// Helper hook for keyboard detection
export const useKeyboardState = () => {
  const viewports = useVisualViewport();

  if (!viewports) return { isKeyboardOpen: false, keyboardHeight: 0 };

  const keyboardHeight =
    viewports.viewport.height - viewports.visualViewport.height;
  const isKeyboardOpen = keyboardHeight > 150; // Threshold for keyboard detection

  return {
    isKeyboardOpen,
    keyboardHeight,
    viewports,
  };
};
