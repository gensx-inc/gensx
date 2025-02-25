import { afterEach, beforeEach, vi } from "vitest";

afterEach(() => {
  vi.clearAllMocks();
});

beforeEach(() => {
  vi.resetModules();
});

// Use vi.mock to automatically use the implementation in __mocks__/openai.ts
vi.mock("openai");
