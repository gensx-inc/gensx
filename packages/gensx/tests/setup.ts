import type { ReactElement } from "react";

import { afterEach, beforeEach, vi } from "vitest";

// Mock WebAssembly module
vi.mock("yoga-layout/dist/binaries/yoga-wasm-base64-esm.js", () => ({
  default: {
    loadYoga: () =>
      Promise.resolve({
        createNode: () => ({
          setWidth: vi.fn(),
          setHeight: vi.fn(),
          setPosition: vi.fn(),
          setPositionType: vi.fn(),
          setFlexDirection: vi.fn(),
          setFlexWrap: vi.fn(),
          setJustifyContent: vi.fn(),
          setAlignItems: vi.fn(),
          setAlignContent: vi.fn(),
          setPadding: vi.fn(),
          setMargin: vi.fn(),
          setBorder: vi.fn(),
          setFlex: vi.fn(),
          setFlexGrow: vi.fn(),
          setFlexShrink: vi.fn(),
          setFlexBasis: vi.fn(),
          setDisplay: vi.fn(),
          calculateLayout: vi.fn(),
          getComputedLayout: () => ({
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            width: 0,
            height: 0,
          }),
        }),
      }),
  },
}));

// Mock yoga-layout
vi.mock("yoga-layout", () => ({
  default: {
    createNode: () => ({
      setWidth: vi.fn(),
      setHeight: vi.fn(),
      setPosition: vi.fn(),
      setPositionType: vi.fn(),
      setFlexDirection: vi.fn(),
      setFlexWrap: vi.fn(),
      setJustifyContent: vi.fn(),
      setAlignItems: vi.fn(),
      setAlignContent: vi.fn(),
      setPadding: vi.fn(),
      setMargin: vi.fn(),
      setBorder: vi.fn(),
      setFlex: vi.fn(),
      setFlexGrow: vi.fn(),
      setFlexShrink: vi.fn(),
      setFlexBasis: vi.fn(),
      setDisplay: vi.fn(),
      calculateLayout: vi.fn(),
      getComputedLayout: () => ({
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        width: 0,
        height: 0,
      }),
    }),
  },
}));

// Mock ink's internal use of yoga-layout
vi.mock("ink", async () => {
  const actual = await vi.importActual("ink");
  return {
    ...actual,
    render: (_element: ReactElement) => ({
      lastFrame: () => "",
      rerender: vi.fn(),
      unmount: vi.fn(),
      cleanup: vi.fn(),
    }),
  };
});

afterEach(() => {
  vi.clearAllMocks();
});

beforeEach(() => {
  vi.resetModules();
});
