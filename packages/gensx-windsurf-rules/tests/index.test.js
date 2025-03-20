import { exec } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { suite } from "vitest";

suite("Gensx Windsurf Rules", () => {
  test("should create the rules", async () => {
    const tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "gensx-windsurf-rules-"),
    );

    const cwd = process.cwd();

    // execute the bin/cli.js file
    await new Promise((resolve, reject) => {
      exec(
        `${cwd}/bin/cli.js`,
        {
          cwd: tmpDir,
        },
        (error, stdout, stderr) => {
          if (error) reject(error);
          resolve({ stdout, stderr });
        },
      );
    });

    // check if the .windsurfrules file was created
    const ruleFile = path.join(tmpDir, ".windsurfrules");
    expect(fs.existsSync(ruleFile)).toBe(true);
    expect(fs.readFileSync(ruleFile, "utf8")).toContain(
      "GenSX Project Guidelines",
    );
  });
});
