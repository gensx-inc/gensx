import { render } from "ink-testing-library";
import React from "react";
import { afterEach, beforeEach, expect, it, suite, vi } from "vitest";

import { LoginUI } from "../../src/commands/login.js";
import * as config from "../../src/utils/config.js";
import { waitForText } from "../test-helpers.js";

// Define the type for the global callback
declare global {
  var __useInputCallback:
    | ((input: string, key: { return?: boolean; escape?: boolean }) => void)
    | undefined;
}

// Mock dependencies
vi.mock("open");
vi.mock("ink", async () => {
  const actual = await vi.importActual("ink");
  return {
    ...actual,
    useInput: vi.fn((callback) => {
      // Store the callback for later use
      global.__useInputCallback = callback;
    }),
    useApp: () => ({
      exit: vi.fn(),
    }),
  };
});
vi.mock("../../src/utils/config.js", async (importOriginal) => {
  const actual = await importOriginal<typeof config>();
  return {
    ...actual,
    saveAuth: vi.fn(),
    saveState: vi.fn(),
  };
});

const originalFetch = global.fetch;
afterEach(() => {
  vi.clearAllMocks();
  global.fetch = originalFetch;
  delete global.__useInputCallback;
});

suite("login command", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset all mocks
    vi.resetAllMocks();

    // Setup config mocks
    vi.mocked(config.saveAuth).mockResolvedValue(undefined);
    vi.mocked(config.saveState).mockResolvedValue(undefined);

    // Mock fetch globally
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  it("should complete login flow successfully", async () => {
    // Mock device auth request
    mockFetch
      // First call - create login request
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            requestId: "test-request-id",
            expiresAt: new Date(Date.now() + 300000).toISOString(), // 5 minutes from now
          }),
      })
      // Second call - first poll (pending)
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            status: "pending",
          }),
      })
      // Third call - second poll (completed)
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            status: "completed",
            token: "test-token",
            orgSlug: "test-org",
          }),
      });

    const { lastFrame } = render(React.createElement(LoginUI));

    // Wait for initial prompt
    await waitForText(
      lastFrame,
      /Press Enter to open your browser and log in to GenSX Cloud/,
    );

    // Simulate Enter key press
    const callback = global.__useInputCallback;
    if (!callback) throw new Error("useInput callback not found");
    callback("", { return: true });

    // Wait for successful login message with a longer timeout
    await waitForText(lastFrame, /Successfully logged into GenSX/, 5000);

    // Verify config was saved
    expect(config.saveAuth).toHaveBeenCalledWith({
      token: "test-token",
      org: "test-org",
    });
    expect(config.saveState).toHaveBeenCalledWith({
      hasCompletedFirstTimeSetup: true,
      lastLoginAt: expect.any(String),
    });
  });

  it("should handle login expiration", async () => {
    // Mock device auth request
    mockFetch
      // First call - create login request
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            requestId: "test-request-id",
            expiresAt: new Date(Date.now() + 300000).toISOString(),
          }),
      })
      // Second call - expired
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            status: "expired",
          }),
      });

    const { lastFrame } = render(React.createElement(LoginUI));

    // Wait for initial prompt
    await waitForText(
      lastFrame,
      /Press Enter to open your browser and log in to GenSX Cloud/,
    );

    // Simulate Enter key press
    const callback = global.__useInputCallback;
    if (!callback) throw new Error("useInput callback not found");
    callback("", { return: true });

    // Wait for error message
    await waitForText(lastFrame, /Login expired/);

    expect(config.saveAuth).not.toHaveBeenCalled();
    expect(config.saveState).not.toHaveBeenCalled();
  });

  it("should handle network errors during login request", async () => {
    // Mock failed device auth request
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: "Network Error",
    });

    const { lastFrame } = render(React.createElement(LoginUI));

    // Wait for initial prompt
    await waitForText(
      lastFrame,
      /Press Enter to open your browser and log in to GenSX Cloud/,
    );

    // Simulate Enter key press
    const callback = global.__useInputCallback;
    if (!callback) throw new Error("useInput callback not found");
    callback("", { return: true });

    // Wait for error message
    await waitForText(
      lastFrame,
      /Failed to create login request: Network Error/,
    );

    expect(config.saveAuth).not.toHaveBeenCalled();
    expect(config.saveState).not.toHaveBeenCalled();
  });

  it("should handle network errors during polling", async () => {
    // Mock device auth request
    mockFetch
      // First call - create login request
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            requestId: "test-request-id",
            expiresAt: new Date(Date.now() + 300000).toISOString(),
          }),
      })
      // Second call - network error during polling
      .mockResolvedValueOnce({
        ok: false,
        statusText: "Network Error",
      });

    const { lastFrame } = render(React.createElement(LoginUI));

    // Wait for initial prompt
    await waitForText(
      lastFrame,
      /Press Enter to open your browser and log in to GenSX Cloud/,
    );

    // Simulate Enter key press
    const callback = global.__useInputCallback;
    if (!callback) throw new Error("useInput callback not found");
    callback("", { return: true });

    // Wait for error message
    await waitForText(lastFrame, /Failed to check login status: Network Error/);

    expect(config.saveAuth).not.toHaveBeenCalled();
    expect(config.saveState).not.toHaveBeenCalled();
  });

  it("should handle invalid server responses", async () => {
    // Mock invalid device auth request response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          // Missing required fields
        }),
    });

    const { lastFrame } = render(React.createElement(LoginUI));

    // Wait for initial prompt
    await waitForText(
      lastFrame,
      /Press Enter to open your browser and log in to GenSX Cloud/,
    );

    // Simulate Enter key press
    const callback = global.__useInputCallback;
    if (!callback) throw new Error("useInput callback not found");
    callback("", { return: true });

    // Wait for error message
    await waitForText(lastFrame, /Invalid response from server/);

    expect(config.saveAuth).not.toHaveBeenCalled();
    expect(config.saveState).not.toHaveBeenCalled();
  });
});
