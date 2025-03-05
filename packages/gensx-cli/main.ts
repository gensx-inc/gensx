import { Buffer } from "node:buffer";
import { createHash, getRandomValues } from "node:crypto";
import { hostname } from "node:os";

import { consola } from "npm:consola";
import open from "npm:open";
import ora from "npm:ora";
import picocolors from "npm:picocolors";

import { waitForKeypress } from "./terminal.ts";

// Re-export these from gensx for other commands
export { runCLI } from "npm:gensx";

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

const API_BASE_URL = "https://api.gensx.com";
const APP_BASE_URL = "https://app.gensx.com";

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

async function saveConfig(config: {
  token: string;
  org: string;
}): Promise<void> {
  const configDir = await Deno.makeTempDir();
  const configFile = `${configDir}/config`;

  const configContent = `[api]
token = ${config.token}
org = ${config.org}
baseUrl = ${API_BASE_URL}

[console]
baseUrl = ${APP_BASE_URL}
`;

  await Deno.writeTextFile(configFile, configContent);
}

async function login(): Promise<{ skipped: boolean }> {
  const spinner = ora();

  try {
    consola.log(
      picocolors.yellow(
        `Press any key to open your browser and login to GenSX Cloud (ESC to skip)`,
      ),
    );

    // Wait for any keypress
    const key = await waitForKeypress();
    if (key === "\u001b") {
      // ESC key
      spinner.info("Login skipped");
      return { skipped: true };
    }

    spinner.start("Logging in to GenSX Cloud");
    const verificationCode = generateVerificationCode();
    const request = await createLoginRequest(verificationCode);
    spinner.succeed();

    const authUrl = new URL(`/auth/device/${request.requestId}`, APP_BASE_URL);
    authUrl.searchParams.set("code_verifier", verificationCode);

    spinner.start(`Opening ${picocolors.blue(authUrl.toString())}`);
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
          org: status.orgSlug,
        };
        await saveConfig(config);
        spinner.succeed("Successfully logged in to GenSX");
        return { skipped: false };
      }
      // Wait 1 second before polling again
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } while (status.status === "pending");

    return { skipped: false };
  } catch (error) {
    consola.error("Error:", error);
    spinner.fail(
      "Login failed: " +
        (error instanceof Error ? error.message : String(error)),
    );
    throw error;
  }
}

if (import.meta.main) {
  const args = Deno.args;
  if (args[0] === "login") {
    await login();
  } else {
    // For other commands, use the regular gensx CLI
    const { runCLI } = await import("npm:gensx");
    await runCLI();
  }
}
