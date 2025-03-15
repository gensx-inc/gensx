#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Skip installation in production environments
if (process.env.NODE_ENV === 'production') {
  console.log('Skipping Cline rules installation in production environment');
  process.exit(0);
}

try {
  // Determine the app root directory (the directory where the application using this package is installed)
  const appRootDir = process.env.INIT_CWD || process.cwd();
  
  // Path to the template .clinerules file
  const templatePath = path.join(__dirname, '..', 'templates', '.clinerules');
  
  // Destination path in the app root
  const destPath = path.join(appRootDir, '.clinerules');

  // Check if destination file already exists
  if (fs.existsSync(destPath)) {
    console.log(`Cline rules file already exists at ${destPath}, skipping installation`);
    process.exit(0);
  }

  // Ensure the template file exists
  if (!fs.existsSync(templatePath)) {
    console.error(`Template file not found at ${templatePath}`);
    process.exit(1);
  }

  // Copy the template file to the destination
  fs.copyFileSync(templatePath, destPath);
  console.log(`Installed Cline rules to ${destPath}`);
} catch (error) {
  console.error('Error installing Cline rules:', error.message);
  process.exit(1);
}