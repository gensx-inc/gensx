import { exec } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { expect, suite, test } from "vitest";

suite("Gensx Cursor Rules", () => {
  test("should create the rules", async () => {
    const tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "gensx-cursor-rules-"),
    );

    const cwd = process.cwd();

    // execute the bin/cli.js file
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

    // check if the .cursor directory was created
    const cursorDir = path.join(tmpDir, ".cursor");
    expect(fs.existsSync(cursorDir)).toBe(true);

    // Ensure it contains all the files from ./rules
    const ruleFiles = fs.readdirSync(path.join(cwd, "rules"));
    ruleFiles.forEach((file) => {
      expect(fs.existsSync(path.join(cursorDir, file))).toBe(true);
    });
  });
});
