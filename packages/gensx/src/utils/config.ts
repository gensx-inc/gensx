import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir, platform } from "node:os";
import path from "node:path";
import process from "node:process";

import { parse as parseIni, stringify as stringifyIni } from "ini";

// Default URLs to use if no config file exists and no env vars are set
const DEFAULT_API_URL = "https://api.gensx.com";
const DEFAULT_CONSOLE_URL = "https://app.gensx.com";

// Public types
export interface AuthConfig {
  token: string;
  org: string;
  apiBaseUrl: string;
  consoleBaseUrl: string;
}

export interface CliState {
  hasCompletedFirstTimeSetup: boolean;
  lastLoginAt?: string;
}

// Internal types for the config file format
interface ConfigFileFormat {
  api?: {
    token?: string;
    org?: string;
    baseUrl?: string;
  };
  console?: {
    baseUrl?: string;
  };
  state?: Partial<CliState>;
}

// Default values
const DEFAULT_STATE: CliState = {
  hasCompletedFirstTimeSetup: false,
};

// Configuration path management
export function getConfigPaths(): { configDir: string; configFile: string } {
  if (process.env.GENSX_CONFIG_DIR) {
    return {
      configDir: process.env.GENSX_CONFIG_DIR,
      configFile: path.join(process.env.GENSX_CONFIG_DIR, "config"),
    };
  }

  const home = homedir();

  if (platform() === "win32") {
    const appData =
      process.env.APPDATA ?? path.join(home, "AppData", "Roaming");
    return {
      configDir: path.join(appData, "gensx"),
      configFile: path.join(appData, "gensx", "config"),
    };
  }

  const xdgConfigHome =
    process.env.XDG_CONFIG_HOME ?? path.join(home, ".config");
  return {
    configDir: path.join(xdgConfigHome, "gensx"),
    configFile: path.join(xdgConfigHome, "gensx", "config"),
  };
}

// Helper to check if auth config is complete
function isCompleteAuth(auth: {
  token?: string;
  org?: string;
}): auth is { token: string; org: string; baseUrl?: string } {
  return typeof auth.token === "string" && typeof auth.org === "string";
}

// Core config operations
async function readConfigFile(): Promise<ConfigFileFormat> {
  const { configFile } = getConfigPaths();

  try {
    const fileContent = await readFile(configFile, "utf-8");
    return parseIni(fileContent) as ConfigFileFormat;
  } catch (_err) {
    return {};
  }
}

async function writeConfigFile(config: ConfigFileFormat): Promise<void> {
  const { configDir, configFile } = getConfigPaths();

  try {
    await mkdir(configDir, { recursive: true, mode: 0o700 });
    const configContent = stringifyIni(config);
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

// Public API
export async function getAuth(): Promise<AuthConfig | null> {
  const config = await readConfigFile();
  return config.api && isCompleteAuth(config.api)
    ? {
        token: config.api.token,
        org: config.api.org,
        apiBaseUrl: await resolveApiBaseUrl(config),
        consoleBaseUrl: await resolveAppBaseUrl(config),
      }
    : null;
}

export async function getState(): Promise<CliState> {
  const config = await readConfigFile();
  return {
    ...DEFAULT_STATE,
    ...config.state,
  };
}

export async function saveAuth(
  auth: Pick<AuthConfig, "token" | "org"> | null,
): Promise<void> {
  const config = await readConfigFile();

  await writeConfigFile({
    ...config,
    api: {
      ...(auth && { token: auth.token, org: auth.org }),
      baseUrl:
        process.env.GENSX_API_BASE_URL ??
        config.api?.baseUrl ??
        DEFAULT_API_URL,
    },
    console: {
      baseUrl:
        process.env.GENSX_APP_BASE_URL ??
        config.console?.baseUrl ??
        DEFAULT_CONSOLE_URL,
    },
  });
}

export async function saveState(state: Partial<CliState>): Promise<void> {
  const config = await readConfigFile();
  const currentState = await getState();

  await writeConfigFile({
    ...config,
    api: {
      ...config.api,
      baseUrl:
        process.env.GENSX_API_BASE_URL ??
        config.api?.baseUrl ??
        DEFAULT_API_URL,
    },
    console: {
      baseUrl:
        process.env.GENSX_APP_BASE_URL ??
        config.console?.baseUrl ??
        DEFAULT_CONSOLE_URL,
    },
    state: {
      ...currentState,
      ...state,
    },
  });
}

// Backwards compatibility layer
export async function readConfig() {
  const config = await readConfigFile();

  return {
    config: {
      api: {
        ...config.api,
        baseUrl: await resolveApiBaseUrl(config),
      },
      console: {
        baseUrl: await resolveAppBaseUrl(config),
      },
    },
    state: await getState(),
  };
}

export async function saveConfig(
  auth: AuthConfig | null,
  state?: Partial<CliState>,
): Promise<void> {
  if (state) {
    await saveState(state);
  }
  await saveAuth(auth);
}

export async function resolveApiBaseUrl(
  config?: ConfigFileFormat,
): Promise<string> {
  config ??= await readConfigFile();

  return (
    process.env.GENSX_API_BASE_URL ?? config.api?.baseUrl ?? DEFAULT_API_URL
  );
}

export async function resolveAppBaseUrl(
  config?: ConfigFileFormat,
): Promise<string> {
  config ??= await readConfigFile();

  return (
    process.env.GENSX_APP_BASE_URL ??
    config.console?.baseUrl ??
    DEFAULT_CONSOLE_URL
  );
}
