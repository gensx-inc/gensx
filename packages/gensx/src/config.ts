import { readFileSync } from "node:fs";
import { homedir, platform } from "node:os";
import { join } from "node:path";

import { parse as parseIni } from "ini";

export interface GensxConfig {
  api?: {
    token?: string;
    org?: string;
    baseUrl?: string;
  };
}

export function getConfigPath(): string {
  // Allow override through environment variable
  if (process.env.GENSX_CONFIG_DIR) {
    return join(process.env.GENSX_CONFIG_DIR, "config");
  }

  const home = homedir();

  // Platform-specific paths
  if (platform() === "win32") {
    // Windows: %APPDATA%\gensx\config
    const appData = process.env.APPDATA ?? join(home, "AppData", "Roaming");
    return join(appData, "gensx", "config");
  }

  // Unix-like systems (Linux, macOS): ~/.config/gensx/config
  const xdgConfigHome = process.env.XDG_CONFIG_HOME ?? join(home, ".config");
  return join(xdgConfigHome, "gensx", "config");
}

export function readConfig(): GensxConfig {
  try {
    const configPath = getConfigPath();
    const configContent = readFileSync(configPath, "utf-8");
    return parseIni(configContent) as GensxConfig;
  } catch (_err) {
    // If file doesn't exist or can't be read, return empty config
    return {};
  }
}
