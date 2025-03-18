#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// Constants for managed section markers
const BEGIN_MANAGED_SECTION = "<!-- BEGIN_MANAGED_SECTION -->";
const END_MANAGED_SECTION = "<!-- END_MANAGED_SECTION -->";

/**
 * Extract content between managed section markers
 * @param {string} content - File content
 * @returns {string|null} - Managed section content or null if not found
 */
function extractManagedSection(content) {
  const startIndex = content.indexOf(BEGIN_MANAGED_SECTION);
  const endIndex = content.indexOf(END_MANAGED_SECTION);

  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    return content.substring(startIndex, endIndex + END_MANAGED_SECTION.length);
  }

  return null;
}

/**
 * Update only the managed section of the file
 * @param {string} existingContent - Current file content
 * @param {string} templateContent - Template file content
 * @returns {string} - Updated file content
 */
function updateManagedSection(existingContent, templateContent) {
  const existingManagedSection = extractManagedSection(existingContent);
  const templateManagedSection = extractManagedSection(templateContent);

  if (!existingManagedSection || !templateManagedSection) {
    return templateContent; // Use template content if can't determine managed sections
  }

  // Replace just the managed section
  return existingContent.replace(
    existingManagedSection,
    templateManagedSection,
  );
}

try {
  // Use current working directory as target
  const targetDir = process.cwd();

  // Path to the template .windsurfrules file
  const templatePath = path.join(
    __dirname,
    "..",
    "templates",
    ".windsurfrules",
  );

  // Destination path in the target directory
  const destPath = path.join(targetDir, ".windsurfrules");

  // Ensure the template file exists
  if (!fs.existsSync(templatePath)) {
    console.error(`Template file not found at ${templatePath}`);
    process.exit(1);
  }

  const templateContent = fs.readFileSync(templatePath, "utf8");

  // Check if destination file already exists
  if (fs.existsSync(destPath)) {
    const existingContent = fs.readFileSync(destPath, "utf8");

    // Check if content is unchanged
    if (existingContent === templateContent) {
      console.log(`${destPath} is already up to date.`);
      process.exit(0);
    }

    // Create a backup of the existing file
    fs.writeFileSync(`${destPath}.backup`, existingContent);

    // Update just the managed section
    const updatedContent = updateManagedSection(
      existingContent,
      templateContent,
    );
    fs.writeFileSync(destPath, updatedContent);

    console.log(
      `✅ Updated .windsurfrules to the latest version with managed sections.`,
    );
    console.log(`ℹ️ Your previous file was backed up to .windsurfrules.backup`);
    console.log(
      `ℹ️ Add your custom content outside the managed section to preserve it during future updates.`,
    );
  } else {
    // Create a new file from template if it doesn't exist
    fs.writeFileSync(destPath, templateContent);
    console.log(`✅ Installed Windsurf rules to ${destPath}`);
  }
} catch (error) {
  console.error("Error installing Windsurf rules:", error.message);
  process.exit(1);
}
