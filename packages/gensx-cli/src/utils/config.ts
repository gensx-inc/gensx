import { mkdir, readFile, writeFile } from "fs/promises";
import { homedir, platform } from "os";
import path from "path";

import { parse as parseIni, stringify as stringifyIni } from "ini";

export const API_BASE_URL =
  process.env.GENSX_API_BASE_URL ?? "https://api.gensx.com";
export const APP_BASE_URL =
  process.env.GENSX_APP_BASE_URL ?? "https://app.gensx.com";

export interface Config {
  token: string;
  orgSlug: string;
}

export interface State {
  hasCompletedFirstTimeSetup?: boolean;
  lastLoginAt?: string;
}

interface FullConfig {
  api?: {
    token?: string;
    org?: string;
    baseUrl?: string;
  };
  console?: {
    baseUrl?: string;
  };
  state?: State;
}

export function getConfigPath(): { configDir: string; configFile: string } {
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

export async function readConfig(): Promise<{
  config: Config | null;
  state: State;
}> {
  const { configFile } = getConfigPath();

  try {
    const fileContent = await readFile(configFile, "utf-8");
    const parsed = parseIni(fileContent) as FullConfig;

    // Extract config if it exists
    const config =
      parsed.api?.token && parsed.api.org
        ? {
            token: parsed.api.token,
            orgSlug: parsed.api.org,
          }
        : null;

    // Extract state with defaults
    const state: State = {
      hasCompletedFirstTimeSetup: false,
      lastLoginAt: undefined,
      ...parsed.state,
    };

    return { config, state };
  } catch (_err) {
    // If file doesn't exist or can't be read, return defaults
    return {
      config: null,
      state: {
        hasCompletedFirstTimeSetup: false,
      },
    };
  }
}

export async function saveConfig(
  config: Config,
  state?: Partial<State>,
): Promise<void> {
  const { configDir, configFile } = getConfigPath();

  try {
    await mkdir(configDir, { recursive: true, mode: 0o700 });

    // Read existing config to preserve state if not provided
    let existingState: State = {
      hasCompletedFirstTimeSetup: false,
    };
    try {
      const existing = await readConfig();
      existingState = existing.state;
    } catch (_err) {
      // Ignore read errors
    }

    const configContent = stringifyIni({
      api: {
        token: config.token,
        org: config.orgSlug,
        baseUrl: API_BASE_URL,
      },
      console: {
        baseUrl: APP_BASE_URL,
      },
      state: {
        ...existingState,
        ...state,
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

export async function updateState(state: Partial<State>): Promise<void> {
  const { config, state: existingState } = await readConfig();
  if (!config) {
    throw new Error("Cannot update state without existing config");
  }
  await saveConfig(config, { ...existingState, ...state });
}
