/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { createInterface } from "node:readline";

import { afterEach, beforeEach, expect, it, Mock, suite, vi } from "vitest";

import { login } from "../../src/commands/login.js";
import * as config from "../../src/utils/config.js";

// Mock dependencies
vi.mock("node:readline");
vi.mock("open");
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
});

suite("login command", () => {
  const mockReadline = {
    question: vi.fn(),
    close: vi.fn(),
  };

  let mockFetch: Mock;

  beforeEach(() => {
    // Reset all mocks
    vi.resetAllMocks();

    // Setup readline mock
    (createInterface as Mock).mockReturnValue(mockReadline);

    // Setup config mocks
    vi.mocked(config.saveAuth).mockResolvedValue(undefined);
    vi.mocked(config.saveState).mockResolvedValue(undefined);

    // Mock fetch globally
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should skip login when user presses Escape", async () => {
    // Mock user input
    mockReadline.question.mockImplementation((_, callback) => {
      callback(String.fromCharCode(27));
    });

    const result = await login();

    expect(result.skipped).toBe(true);
    expect(mockFetch).not.toHaveBeenCalled();
    expect(config.saveAuth).not.toHaveBeenCalled();
    expect(config.saveState).not.toHaveBeenCalled();
  });

  it("should complete login flow successfully", async () => {
    // Mock user pressing Enter
    mockReadline.question.mockImplementation((_, callback) => {
      callback("");
    });

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

    const result = await login();

    expect(result.skipped).toBe(false);

    // Verify initial device auth request
    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      expect.any(URL),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      }),
    );
    expect((mockFetch.mock.calls[0][0] as URL).toString()).toBe(
      "https://api.gensx.com/auth/device/request",
    );

    // Verify first polling request
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      expect.any(URL),
      expect.any(Object),
    );
    expect((mockFetch.mock.calls[1][0] as URL).toString()).toMatch(
      /^https:\/\/api\.gensx\.com\/auth\/device\/request\/test-request-id\?code_verifier=.+$/,
    );

    // Verify second polling request
    expect(mockFetch).toHaveBeenNthCalledWith(
      3,
      expect.any(URL),
      expect.any(Object),
    );
    expect((mockFetch.mock.calls[2][0] as URL).toString()).toMatch(
      /^https:\/\/api\.gensx\.com\/auth\/device\/request\/test-request-id\?code_verifier=.+$/,
    );

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
    // Mock user pressing Enter
    mockReadline.question.mockImplementation((_, callback) => {
      callback("");
    });

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

    await expect(login()).rejects.toThrow("Login expired");

    expect(config.saveAuth).not.toHaveBeenCalled();
    expect(config.saveState).not.toHaveBeenCalled();
  });

  it("should handle network errors during login request", async () => {
    // Mock user pressing Enter
    mockReadline.question.mockImplementation((_, callback) => {
      callback("");
    });

    // Mock failed device auth request
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: "Network Error",
    });

    await expect(login()).rejects.toThrow(
      "Failed to create login request: Network Error",
    );

    expect(config.saveAuth).not.toHaveBeenCalled();
    expect(config.saveState).not.toHaveBeenCalled();
  });

  it("should handle network errors during polling", async () => {
    // Mock user pressing Enter
    mockReadline.question.mockImplementation((_, callback) => {
      callback("");
    });

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

    await expect(login()).rejects.toThrow(
      "Failed to check login status: Network Error",
    );

    expect(config.saveAuth).not.toHaveBeenCalled();
    expect(config.saveState).not.toHaveBeenCalled();
  });

  it("should handle invalid server responses", async () => {
    // Mock user pressing Enter
    mockReadline.question.mockImplementation((_, callback) => {
      callback("");
    });

    // Mock invalid device auth request response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          // Missing required fields
        }),
    });

    await expect(login()).rejects.toThrow("Invalid response from server");

    expect(config.saveAuth).not.toHaveBeenCalled();
    expect(config.saveState).not.toHaveBeenCalled();
  });
});
