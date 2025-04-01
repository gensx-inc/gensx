import { afterEach, beforeEach, vi } from "vitest";

import { mockCreateMethod } from "../__mocks__/openai.js";

afterEach(() => {
  vi.clearAllMocks();
});

beforeEach(() => {
  vi.resetModules();
});

// Use vi.mock to automatically use the implementation in __mocks__/openai.ts
vi.mock("openai");

// Export the mock method for spying in tests
export const openAISpy = mockCreateMethod;
