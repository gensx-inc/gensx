import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(dirname, "..", "..", "..");

const localPackageJson = JSON.parse(
  readFileSync(path.join(rootDir, "package.json"), "utf8"),
) as { version: string };

export const VERSION = localPackageJson.version;
export const USER_AGENT = `@gensx/gensx-cloud-mcp v${VERSION}`;
