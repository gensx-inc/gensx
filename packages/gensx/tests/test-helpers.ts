import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { vi } from "vitest";

// Setup test environment with temporary directories
export async function setupTestEnvironment(testPrefix: string) {
  // Save original process.cwd
  const origCwd = process.cwd.bind(process);

  // Create a temp directory for tests
  const tempDir = await fs.mkdtemp(
    path.join(os.tmpdir(), `gensx-${testPrefix}-`),
  );

  // Create project and config directories
  await fs.mkdir(path.join(tempDir, "project"), { recursive: true });
  await fs.mkdir(path.join(tempDir, ".gensx", "projects"), { recursive: true });

  // Override the config directory
  const origConfigDir = process.env.GENSX_CONFIG_DIR;
  process.env.GENSX_CONFIG_DIR = path.join(tempDir, ".gensx");

  return { tempDir, origCwd, origConfigDir };
}

// Clean up test environment
export async function cleanupTestEnvironment(
  tempDir: string,
  origCwd: typeof process.cwd,
  origConfigDir?: string,
) {
  // Restore original environment
  process.cwd = origCwd;
  if (origConfigDir) {
    process.env.GENSX_CONFIG_DIR = origConfigDir;
  } else {
    delete process.env.GENSX_CONFIG_DIR;
  }

  // Clean up temp directory
  await fs.rm(tempDir, { recursive: true, force: true });
}

// Clean up project files after each test
export async function cleanupProjectFiles(tempDir: string) {
  try {
    const projectsDir = path.join(tempDir, ".gensx", "projects");
    const files = await fs.readdir(projectsDir);

    for (const file of files) {
      if (file !== ".gitkeep") {
        await fs.unlink(path.join(projectsDir, file));
      }
    }

    // Clean up project config file
    try {
      await fs.unlink(path.join(tempDir, "project", "gensx.yaml"));
    } catch (_error) {
      // Ignore if file doesn't exist
    }
  } catch (_error) {
    // Ignore cleanup errors
  }
}

// Wait for specific text to appear in the rendered output
export function waitForText(
  getFrame: () => string | undefined,
  text: string | RegExp,
  timeout = 1000,
) {
  return new Promise<void>((resolve, reject) => {
    const start = Date.now();
    function check() {
      const frame = getFrame() ?? ""; // treat undefined as empty string
      if (typeof text === "string" ? frame.includes(text) : text.test(frame)) {
        resolve();
      } else if (Date.now() - start > timeout) {
        reject(
          new Error(
            `Timed out waiting for text: ${text}\nCurrent frame: ${frame}`,
          ),
        );
      } else {
        setTimeout(check, 20);
      }
    }
    check();
  });
}

// Helper to wait for a mock function to be called
export function waitForMockCall(
  mockFn: ReturnType<typeof vi.fn>,
  timeout = 200,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const start = Date.now();
    function check() {
      if (mockFn.mock.calls.length > 0) {
        resolve();
      } else if (Date.now() - start > timeout) {
        reject(new Error(`Timed out waiting for mock function to be called`));
      } else {
        setTimeout(check, 20);
      }
    }
    check();
  });
}
