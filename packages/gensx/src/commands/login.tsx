import { Buffer } from "node:buffer";
import { createHash, getRandomValues } from "node:crypto";
import { hostname } from "node:os";

import { Box, Text, useApp, useInput } from "ink";
import Spinner from "ink-spinner";
import { useCallback, useState } from "react";

import { ErrorMessage } from "../components/ErrorMessage.js";
import { LoadingSpinner } from "../components/LoadingSpinner.js";
import {
  resolveApiBaseUrl,
  resolveAppBaseUrl,
  saveAuth,
  saveState,
} from "../utils/config.js";
import { USER_AGENT } from "../utils/user-agent.js";

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
  const apiBaseUrl = await resolveApiBaseUrl();
  const url = new URL("/auth/device/request", apiBaseUrl);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
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

  const body = (await response.json()) as DeviceAuthRequest;
  if (!body.requestId || !body.expiresAt) {
    throw new Error("Invalid response from server");
  }

  return body;
}

async function pollLoginStatus(
  requestId: string,
  verificationCode: string,
): Promise<DeviceAuthStatus> {
  const apiBaseUrl = await resolveApiBaseUrl();
  const url = new URL(`/auth/device/request/${requestId}`, apiBaseUrl);
  url.searchParams.set("code_verifier", verificationCode);
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to check login status: ${response.statusText}`);
  }

  const body = (await response.json()) as DeviceAuthStatus;
  if (body.status === "pending") {
    return { status: "pending" };
  }

  if (body.status === "expired") {
    throw new Error("Login expired");
  }

  return body;
}

type Phase = "initial" | "creating" | "opening" | "waiting" | "done" | "error";

export function LoginUI() {
  const { exit } = useApp();
  const [phase, setPhase] = useState<Phase>("initial");
  const [error, setError] = useState<string | null>(null);
  const [authUrl, setAuthUrl] = useState<string | null>(null);

  const startLogin = useCallback(async () => {
    try {
      setPhase("creating");
      const verificationCode = generateVerificationCode();
      const request = await createLoginRequest(verificationCode);

      setPhase("opening");
      const appBaseUrl = await resolveAppBaseUrl();
      const url = new URL(`/auth/device/${request.requestId}`, appBaseUrl);
      url.searchParams.set("code_verifier", verificationCode);
      setAuthUrl(url.toString());

      // Open the browser
      await import("open").then((open) => open.default(url.toString()));

      setPhase("waiting");

      // Poll until we get a completed status
      let status: DeviceAuthStatus;
      do {
        status = await pollLoginStatus(request.requestId, verificationCode);
        if (status.status === "completed") {
          await saveAuth({
            token: status.token,
            org: status.orgSlug,
          });
          await saveState({
            hasCompletedFirstTimeSetup: true,
            lastLoginAt: new Date().toISOString(),
          });
          setPhase("done");
          setTimeout(() => {
            exit();
          }, 100);
          return;
        }
        // Wait 1 second before polling again
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } while (status.status === "pending");
    } catch (err) {
      setError((err as Error).message);
      setPhase("error");
      setTimeout(() => {
        exit();
      }, 100);
    }
  }, [exit]);

  // Handle input
  useInput((input, key) => {
    if (key.escape) {
      exit();
      return;
    }
    if (
      phase === "initial" &&
      (input === "\r" || input === "\n" || key.return)
    ) {
      void startLogin();
    }
  });

  if (error) {
    return <ErrorMessage message={error} />;
  }

  return (
    <Box flexDirection="column" gap={1}>
      {phase === "initial" && (
        <Text>
          <Text color="yellow">
            Press Enter to open your browser and log in to GenSX Cloud (or press
            Escape to skip)
          </Text>
        </Text>
      )}

      {phase === "creating" && (
        <LoadingSpinner message="Creating login request..." />
      )}

      {phase === "opening" && authUrl && (
        <Box flexDirection="column">
          <Text>
            <Text color="green" bold>
              ✔
            </Text>{" "}
            Login request created
          </Text>
          <Text>
            <Spinner type="dots" /> Opening <Text color="cyan">{authUrl}</Text>
          </Text>
        </Box>
      )}

      {phase === "waiting" && (
        <Box flexDirection="column">
          <Text>
            <Text color="green" bold>
              ✔
            </Text>{" "}
            Login request created
          </Text>
          <Text>
            <Text color="green" bold>
              ✔
            </Text>{" "}
            Browser opened <Text color="cyan">{authUrl}</Text>
          </Text>
          <Text>
            <Spinner type="dots" /> Waiting for authentication...
          </Text>
        </Box>
      )}

      {phase === "done" && (
        <Box flexDirection="column">
          <Text>
            <Text color="green" bold>
              ✔
            </Text>{" "}
            Login request created
          </Text>
          <Text>
            <Text color="green" bold>
              ✔
            </Text>{" "}
            Browser opened <Text color="cyan">{authUrl}</Text>
          </Text>
          <Text>
            <Text color="green" bold>
              ✔
            </Text>{" "}
            Successfully logged into GenSX
          </Text>
        </Box>
      )}
    </Box>
  );
}

export function login(): { skipped: boolean } {
  return { skipped: false };
}
