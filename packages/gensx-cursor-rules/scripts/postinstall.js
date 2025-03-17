"use strict";

const fs = require("fs-extra");
const path = require("path");

// Get the paths we need to check
const packagePath = path.resolve(process.cwd());

// Check if we're in the monorepo by looking for a packages directory
const isMonorepo = packagePath.includes(path.join("gensx", "packages"));

// Skip if we're in the monorepo
if (isMonorepo) {
  console.log("Skipping postinstall script in monorepo environment");
  process.exit(0);
}

// Skip in production environments
if (process.env.NODE_ENV === "production") {
  console.log(
    "Skipping GenSX cursor rules installation in production environment.",
  );
  process.exit(0);
}

// Get the directory of the package
const pkgDir = path.resolve(__dirname, "..");

// Path to the rules directory
const rulesDir = path.resolve(pkgDir, "rules");

// Attempt to determine the user's project root
// This is typically where package.json is located
// When installed as a dependency, this will be in node_modules/@gensx/cursor-rules
// So we need to go up 3 levels to reach the project root
const projectRoot = path.resolve(pkgDir, "../../..");

async function copyRules() {
  try {
    console.log("Installing GenSX cursor rules...");

    // Create .cursor directory if it doesn't exist
    const cursorDir = path.join(projectRoot, ".cursor");
    await fs.ensureDir(cursorDir);

    // Get list of rule files from the package
    const ruleFiles = await fs.readdir(rulesDir);

    // Copy each rule file to the project's .cursor directory
    let copied = 0;
    let updated = 0;

    // Get list of existing rule files
    let existingFiles = [];
    try {
      existingFiles = await fs.readdir(cursorDir);
    } catch (error) {
      // If directory doesn't exist or isn't readable
    }

    for (const file of ruleFiles) {
      if (!file.endsWith(".mdc")) continue;

      const source = path.join(rulesDir, file);
      const destination = path.join(cursorDir, file);

      const fileExists = existingFiles.includes(file);

      // Copy the rule file
      await fs.copy(source, destination, { overwrite: true });

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
    console.log(
      "You can manually copy the rules from node_modules/@gensx/cursor-rules/rules to your project's .cursor directory.",
    );
  }
}

// Run the script
copyRules().catch(console.error);
