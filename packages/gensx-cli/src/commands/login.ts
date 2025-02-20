import { hostname } from "os";

import { createHash, getRandomValues } from "node:crypto";

import { consola } from "consola";
import open from "open";
import ora from "ora";

import { logger } from "../logger.js";
import { API_BASE_URL, APP_BASE_URL, saveConfig } from "../utils/config.js";
import { waitForKeypress } from "../utils/terminal.js";

interface DeviceAuthRequest {
  requestId: string;
  expiresAt: string;
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
        const config = {
          token: status.token,
          orgSlug: status.orgSlug,
        };
        await saveConfig(config, {
          hasCompletedFirstTimeSetup: true,
          lastLoginAt: new Date().toISOString(),
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
