import { afterEach, beforeEach, vi } from "vitest";

afterEach(() => {
  vi.clearAllMocks();
});

beforeEach(() => {
  vi.resetModules();
});
