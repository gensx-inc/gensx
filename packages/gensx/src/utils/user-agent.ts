import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

let VERSION: string;
try {
  const localPackageJson = JSON.parse(
    readFileSync(path.join(dirname, "..", "..", "package.json"), "utf8"),
  ) as { version: string };
  VERSION = localPackageJson.version;
} catch {
  VERSION = "unknown";
}

export { VERSION };
export const USER_AGENT = `GenSX CLI${VERSION === "unknown" ? "" : ` v${VERSION}`}`;
