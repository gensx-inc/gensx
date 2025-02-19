import { createHash } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { homedir, platform } from "os";
import { hostname } from "os";
import path from "path";

import { consola } from "consola";
import { stringify as stringifyIni } from "ini";
import open from "open";

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
  return Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString(
    "base64url",
  );
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
  const response = await fetch(path.join(API_BASE_URL, "auth/device/request"), {
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
  const response = await fetch(
    path.join(API_BASE_URL, `auth/device/request/${requestId}`) +
      "?code_verifier=" +
      verificationCode,
  );

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
  try {
    consola.info("Starting GenSX login process...");

    const verificationCode = generateVerificationCode();
    const request = await createLoginRequest(verificationCode);

    const authUrl =
      path.join(APP_BASE_URL, "auth/device", request.requestId) +
      "?code_verifier=" +
      verificationCode;
    consola.info(
      "\nPress any key to open the following URL in your browser to complete login:",
    );
    consola.info(authUrl);

    await new Promise((resolve) => {
      process.stdin.once("data", () => {
        resolve(undefined);
      });
    });

    await open(authUrl);

    consola.info("\nWaiting for authentication...");

    for (;;) {
      const status = await pollLoginStatus(request.requestId, verificationCode);
      if (status.status === "completed") {
        await saveConfig({
          token: status.token,
          orgSlug: status.orgSlug,
        });
        consola.success("\nLogin successful!");
        break;
      }

      // Wait 1 second before polling again
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  } catch (error) {
    consola.error(
      "Login failed:",
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  }
}
