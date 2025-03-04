import { readFile, writeFile } from "fs/promises";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

export async function generateServerFile(outDir: string): Promise<void> {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const templatePath = resolve(__dirname, "../templates/server.js.template");
  const indexContent = await readFile(templatePath, "utf-8");
  await writeFile(resolve(outDir, "index.js"), indexContent);
}
