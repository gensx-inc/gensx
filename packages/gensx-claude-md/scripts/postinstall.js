#!/usr/bin/env node
'use strict';

const fs = require('fs-extra');
const path = require('path');

// Skip in production environments
if (process.env.NODE_ENV === 'production') {
  console.log('Skipping GenSX Claude template installation in production environment.');
  process.exit(0);
}

// Get the directory of the package
const pkgDir = path.resolve(__dirname, '..');

// Path to the template directory
const templateDir = path.resolve(pkgDir, 'templates');

// Attempt to determine the user's project root
// This is typically where package.json is located
// When installed as a dependency, this will be in node_modules/@gensx/claude-templates
// So we need to go up 3 levels to reach the project root
const projectRoot = path.resolve(pkgDir, '../../..');

async function copyTemplate() {
  try {
    console.log('Installing GenSX Claude template...');
    
    // Source and destination paths
    const source = path.join(templateDir, 'CLAUDE.md');
    const destination = path.join(projectRoot, 'CLAUDE.md');
    
    // Check if destination file already exists
    let fileExists = false;
    try {
      await fs.access(destination);
      fileExists = true;
    } catch (error) {
      // File doesn't exist
    }
    
    // If file exists, decide what to do based on its content
    if (fileExists) {
      try {
        const destContent = await fs.readFile(destination, 'utf8');
        const sourceContent = await fs.readFile(source, 'utf8');
        
        // If the content is identical to our template, no need to update
        if (destContent === sourceContent) {
          console.log('✅ CLAUDE.md is already up to date.');
        } else {
          // If it contains the default header with edits, likely customized
          const defaultHeaderRegex = /^# GenSX Project Claude Memory/;
          const hasStandardHeader = defaultHeaderRegex.test(destContent);
          
          if (hasStandardHeader) {
            // Create a backup before overwriting
            const backupPath = path.join(projectRoot, 'CLAUDE.md.backup');
            await fs.copy(destination, backupPath);
            await fs.copy(source, destination);
            console.log('✅ Updated CLAUDE.md to the latest version. Your previous file was backed up to CLAUDE.md.backup');
            console.log('ℹ️ To preserve your customizations, please merge your changes from the backup.');
          } else {
            // If it doesn't have our standard header, it might be entirely custom
            console.log('ℹ️ Found an existing CLAUDE.md that appears to be fully customized - preserving your file.');
            console.log('ℹ️ To get the latest template, you can manually copy it from node_modules/@gensx/claude-md/templates/CLAUDE.md');
          }
        }
      } catch (error) {
        console.error('Error comparing files:', error);
      }
    } else {
      // File doesn't exist, create it
      await fs.copy(source, destination);
      console.log('✅ Created new CLAUDE.md template in project root.');
    }
  } catch (error) {
    // Handle case where we might not be in a project (e.g., global install)
    console.error('Failed to install Claude template:', error);
    console.log('You can manually copy the template from node_modules/@gensx/claude-md/templates/CLAUDE.md to your project root.');
  }
}

// Run the script
copyTemplate().catch(console.error);