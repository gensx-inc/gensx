import { afterEach, beforeEach, vi } from "vitest";

// Mock yoga-layout to prevent WebAssembly loading issues in tests
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

afterEach(() => {
  vi.clearAllMocks();
});

beforeEach(() => {
  vi.resetModules();
});
