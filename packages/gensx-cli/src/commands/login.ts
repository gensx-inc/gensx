import { mkdir, writeFile } from "fs/promises";
import { homedir, platform } from "os";
import { hostname } from "os";
import path from "path";

import { createHash, getRandomValues } from "node:crypto";

import { consola } from "consola";
import { stringify as stringifyIni } from "ini";
import open from "open";
import ora from "ora";

import { logger } from "../logger.js";
import { waitForKeypress } from "../utils/terminal.js";

const API_BASE_URL = process.env.GENSX_API_BASE_URL ?? "https://api.gensx.com";
const APP_BASE_URL = process.env.GENSX_APP_BASE_URL ?? "https://app.gensx.com";

function getConfigPath(): { configDir: string; configFile: string } {
  // Allow override through environment variable
  if (process.env.GENSX_CONFIG_DIR) {
    return {
      configDir: process.env.GENSX_CONFIG_DIR,
      configFile: path.join(process.env.GENSX_CONFIG_DIR, "config"),
    };
  }

  const home = homedir();

  // Platform-specific paths
  if (platform() === "win32") {
    // Windows: %APPDATA%\gensx\config
    const appData =
      process.env.APPDATA ?? path.join(home, "AppData", "Roaming");
    return {
      configDir: path.join(appData, "gensx"),
      configFile: path.join(appData, "gensx", "config"),
    };
  }

  // Unix-like systems (Linux, macOS): ~/.config/gensx/config
  const xdgConfigHome =
    process.env.XDG_CONFIG_HOME ?? path.join(home, ".config");
  return {
    configDir: path.join(xdgConfigHome, "gensx"),
    configFile: path.join(xdgConfigHome, "gensx", "config"),
  };
}

interface DeviceAuthRequest {
  requestId: string;
  expiresAt: string;
}

interface Config {
  token: string;
  orgSlug: string;
}

type DeviceAuthStatus =
  | {
      status: "pending" | "expired";
    }
  | {
      status: "completed";
      token: string;
      orgSlug: string;
    };

function generateVerificationCode(): string {
  return Buffer.from(getRandomValues(new Uint8Array(32))).toString("base64url");
}

function createCodeHash(code: string): string {
  return createHash("sha256").update(code).digest("base64url");
}

async function saveConfig(config: Config): Promise<void> {
  const { configDir, configFile } = getConfigPath();

  try {
    await mkdir(configDir, { recursive: true, mode: 0o700 });

    const configContent = stringifyIni({
      api: {
        token: config.token,
        org: config.orgSlug,
        baseUrl: API_BASE_URL,
      },
      console: {
        baseUrl: APP_BASE_URL,
      },
    });

    // Add a helpful header comment
    const fileContent = `; GenSX Configuration File
; Generated on: ${new Date().toISOString()}

${configContent}`;

    const mode = platform() === "win32" ? undefined : 0o600;
    await writeFile(configFile, fileContent, { mode });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error occurred";
    throw new Error(`Failed to save configuration: ${message}`);
  }
}

async function createLoginRequest(
  verificationCode: string,
): Promise<DeviceAuthRequest> {
  const url = new URL("/auth/device/request", API_BASE_URL);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      clientId: hostname(),
      codeChallenge: createCodeHash(verificationCode),
      codeChallengeMethod: "S256",
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create login request: ${response.statusText}`);
  }

  const body = (await response.json()) as {
    status: "ok";
    data: DeviceAuthRequest;
  };
  if (!body.data.requestId || !body.data.expiresAt) {
    throw new Error("Invalid response from server");
  }

  return body.data;
}

async function pollLoginStatus(
  requestId: string,
  verificationCode: string,
): Promise<DeviceAuthStatus> {
  const url = new URL(`/auth/device/request/${requestId}`, API_BASE_URL);
  url.searchParams.set("code_verifier", verificationCode);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to check login status: ${response.statusText}`);
  }

  const body = (await response.json()) as {
    status: "ok";
    data: DeviceAuthStatus;
  };
  if (body.data.status === "pending") {
    return { status: "pending" };
  }

  if (body.data.status === "expired") {
    throw new Error("Login expired");
  }

  return body.data;
}

export async function login(): Promise<void> {
  const spinner = ora();

  try {
    spinner.start("Logging in to GenSX");

    const verificationCode = generateVerificationCode();
    const request = await createLoginRequest(verificationCode);
    spinner.succeed();

    const authUrl = new URL(`/auth/device/${request.requestId}`, APP_BASE_URL);
    authUrl.searchParams.set("code_verifier", verificationCode);

    logger.log(
      `\x1b[33mPress any key to open your browser and authenticate with GenSX:\x1b[0m

\x1b[34m${authUrl.toString()}\x1b[0m`,
    );

    // Wait for any keypress
    await waitForKeypress();

    spinner.start("Opening browser");
    await open(authUrl.toString());
    spinner.succeed();

    spinner.start("Waiting for authentication");

    // Poll until we get a completed status
    let status: DeviceAuthStatus;
    do {
      status = await pollLoginStatus(request.requestId, verificationCode);
      if (status.status === "completed") {
        await saveConfig({
          token: status.token,
          orgSlug: status.orgSlug,
        });
        spinner.succeed("Successfully logged in to GenSX");
        break;
      }
      // Wait 1 second before polling again
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } while (status.status === "pending");
  } catch (error) {
    consola.error("Error:", error);
    spinner.fail(
      "Login failed: " +
        (error instanceof Error ? error.message : String(error)),
    );
    throw error; // Let the error propagate up
  }
}
