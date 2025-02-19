import { exec as execCallback } from "child_process";
import { mkdir, readdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { promisify } from "util";

import ora from "ora";
import pc from "picocolors";

const exec = promisify(execCallback);

const TEMPLATE_MAP: Record<string, string> = {
  ts: "typescript",
};

interface Template {
  name: string;
  description: string;
  dependencies: string[];
  devDependencies: string[];
  runCommand: string;
}

async function loadTemplate(templateName: string): Promise<Template> {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const templatePath = path.join(
    __dirname,
    "templates",
    TEMPLATE_MAP[templateName] || templateName,
  );
  const templateConfigPath = path.join(templatePath, "template.json");

  try {
    const configContent = await readFile(templateConfigPath, "utf-8");
    const template = JSON.parse(configContent) as Template;
    return template;
  } catch (_error) {
    throw new Error(`Template "${templateName}" not found or invalid.`);
  }
}

async function listTemplates(): Promise<string[]> {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const templatesPath = path.join(__dirname, "templates");
  try {
    const templates = await readdir(templatesPath);
    // Map template directories back to their flag values
    return Object.entries(TEMPLATE_MAP)
      .filter(([_, dir]) => templates.includes(dir))
      .map(([flag]) => flag);
  } catch {
    return [];
  }
}

async function copyTemplateFiles(templateName: string, targetPath: string) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const templatePath = path.join(
    __dirname,
    "templates",
    TEMPLATE_MAP[templateName] || templateName,
  );

  async function copyDir(currentPath: string, targetBase: string) {
    const entries = await readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const sourcePath = path.join(currentPath, entry.name);
      const targetFilePath = path
        .join(targetBase, path.relative(templatePath, sourcePath))
        .replace(/\.template$/, "");

      if (entry.name === "template.json") continue;

      if (entry.isDirectory()) {
        await mkdir(targetFilePath, { recursive: true });
        await copyDir(sourcePath, targetBase);
      } else {
        const content = await readFile(sourcePath, "utf-8");
        await mkdir(path.dirname(targetFilePath), { recursive: true });
        await writeFile(targetFilePath, content);
      }
    }
  }

  await copyDir(templatePath, targetPath);
}

export interface CreateOptions {
  template: string;
  force: boolean;
}

export async function createGensxProject(
  projectPath: string,
  options: CreateOptions,
) {
  const spinner = ora();
  const { template: templateName, force } = options;

  try {
    // Validate template exists
    const templates = await listTemplates();
    if (!templates.includes(templateName)) {
      spinner.fail();
      throw new Error(
        `Template "${templateName}" not found. Available templates: ${templates.join(", ")}`,
      );
    }

    // Load template
    const template = await loadTemplate(templateName);

    const absoluteProjectPath = path.resolve(process.cwd(), projectPath);

    // Create and validate project directory
    spinner.start("Creating project directory");
    await mkdir(absoluteProjectPath, { recursive: true });

    const files = await readdir(absoluteProjectPath);
    if (files.length > 0 && !force) {
      spinner.fail();
      throw new Error(
        `Directory "${absoluteProjectPath}" is not empty. Use --force to overwrite existing files.`,
      );
    }
    spinner.succeed();

    // Copy template files
    spinner.start("Copying template files");
    await copyTemplateFiles(templateName, absoluteProjectPath);
    spinner.succeed();

    // Initialize npm project and install dependencies
    process.chdir(absoluteProjectPath);

    spinner.start("Initializing npm project");
    await exec("npm init -y");
    spinner.succeed();

    if (template.dependencies.length > 0) {
      spinner.start("Installing dependencies");
      await exec(`npm install ${template.dependencies.join(" ")}`);
      spinner.succeed();
    }

    if (template.devDependencies.length > 0) {
      spinner.start("Installing development dependencies");
      await exec(`npm install -D ${template.devDependencies.join(" ")}`);
      spinner.succeed();
    }

    // Show success message
    console.info(`
${pc.green("✔")} Successfully created GenSX project in ${pc.cyan(absoluteProjectPath)}

To get started:
  ${projectPath !== "." ? pc.cyan(`cd ${projectPath}`) : ""}
  ${pc.cyan(template.runCommand)}

Edit ${pc.cyan("src/index.tsx")} to start building your GenSX application.
`);
  } catch (error) {
    // If spinner is still spinning, stop it with failure
    if (spinner.isSpinning) {
      spinner.fail();
    }
    throw error; // Re-throw to let caller handle the error
  }
}
