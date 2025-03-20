#!/usr/bin/env node

import fs from "node:fs/promises";
import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function installCursorRules(): Promise<void> {
  try {
    // Path to the template .clinerules file
    const rulesDir = path.join(__dirname, "..", "rules");

    // Use current working directory as target
    const targetDir = process.cwd();

    console.log("Installing GenSX cursor rules...");

    // Create .cursor directory if it doesn't exist
    const cursorDir = path.join(targetDir, ".cursor");
    await fs.mkdir(cursorDir, { recursive: true });

    // Get list of rule files from the package
    const ruleFiles = await fs.readdir(rulesDir);

    // Copy each rule file to the project's .cursor directory
    let copied = 0;
    let updated = 0;

    // Get list of existing rule files
    let existingFiles: string[] = [];
    try {
      existingFiles = await fs.readdir(cursorDir);
    } catch {
      // If directory doesn't exist or isn't readable
    }

    for (const file of ruleFiles) {
      if (!file.endsWith(".mdc")) continue;

      const source = path.join(rulesDir, file);
      const destination = path.join(cursorDir, file);

      const fileExists = existingFiles.includes(file);

      // Copy the rule file
      await fs.copyFile(source, destination);

      if (fileExists) {
        updated++;
      } else {
        copied++;
      }
    }

    console.log(`✅ GenSX cursor rules: ${copied} new, ${updated} updated.`);
  } catch (error) {
    // Handle case where we might not be in a project (e.g., global install)
    console.error("Failed to install cursor rules:", error);
    process.exit(1);
  }
}

// Run the installation
await installCursorRules();
