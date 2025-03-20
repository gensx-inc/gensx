import { exec } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { expect, suite, test } from "vitest";

suite("Gensx Claude MD", () => {
  test("should create the template", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gensx-claude-md-"));

    const cwd = process.cwd();

    // execute the cli.js file
    await new Promise((resolve, reject) => {
      exec(
        `${cwd}/dist/cli.js`,
        {
          cwd: tmpDir,
        },
        (error, stdout, stderr) => {
          if (error) reject(error);
          resolve({ stdout, stderr });
        },
      );
    });

    // check if the CLAUDE.md file was created
    const ruleFile = path.join(tmpDir, "CLAUDE.md");
    expect(fs.existsSync(ruleFile)).toBe(true);
    expect(fs.readFileSync(ruleFile, "utf8")).toContain(
      "GenSX Project Claude Memory",
    );
  });
});
