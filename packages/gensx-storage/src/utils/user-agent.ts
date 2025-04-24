import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

let version = "";
const dirname = path.dirname(fileURLToPath(import.meta.url));

let rootDir = path.resolve(dirname, "..", "..", "..");
let packageJsonPath = path.join(rootDir, "package.json");
if (existsSync(packageJsonPath)) {
  const localPackageJson = JSON.parse(
    readFileSync(packageJsonPath, "utf8"),
  ) as { version: string };
  version = localPackageJson.version;
} else {
  // if the first check fails, try two levels up instead of three
  rootDir = path.resolve(dirname, "..", "..");
  packageJsonPath = path.join(rootDir, "package.json");
  if (existsSync(packageJsonPath)) {
    const localPackageJson = JSON.parse(
      readFileSync(packageJsonPath, "utf8"),
    ) as { version: string };
    version = localPackageJson.version;
  } else {
    console.error("Error trying to get version from package.json");
  }
}

export const VERSION = version;
export const USER_AGENT = `@gensx/storage v${VERSION}`;
