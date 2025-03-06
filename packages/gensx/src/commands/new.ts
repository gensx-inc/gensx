import { exec as execCallback } from "node:child_process";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import enquirer from "enquirer";
import ora from "ora";
import pc from "picocolors";

import { logger } from "../logger.js";
import { readConfig, saveState } from "../utils/config.js";
import { saveProjectConfig } from "../utils/project-config.js";
import { login } from "./login.js";

const exec = promisify(execCallback);

const TEMPLATE_MAP: Record<string, string> = {
  ts: "typescript",
};

const TEMPLATE_NAMES: { [key in keyof typeof TEMPLATE_MAP]: string } = {
  ts: "TypeScript Project",
};

const TEMPLATE_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  process.env.DENO_BINARY ? "src/templates/projects" : "../templates/projects",
);

interface Template {
  name: string;
  description: string;
  dependencies: string[];
  devDependencies: string[];
  runCommand: string;
}

async function loadTemplate(templateName: string): Promise<Template> {
  const templatePath = path.join(
    TEMPLATE_DIR,
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
  try {
    const templates = await readdir(TEMPLATE_DIR);
    // Map template directories back to their flag values
    return Object.entries(TEMPLATE_MAP)
      .filter(([_, dir]) => templates.includes(dir))
      .map(([flag]) => flag);
  } catch {
    return [];
  }
}

interface PromptModule {
  prompt<T>(options: unknown): Promise<T>;
}

async function selectTemplate(): Promise<string> {
  const templates = await listTemplates();
  const choices = templates.map((flag) => ({
    name: flag,
    value: flag,
    message: TEMPLATE_NAMES[flag],
  }));

  if (choices.length === 0) {
    throw new Error("No templates available");
  }

  if (choices.length === 1) {
    return choices[0].value;
  }

  try {
    const prompter = enquirer as PromptModule;
    const response = await prompter.prompt<{ template: string }>({
      type: "select",
      name: "template",
      message: "Select a template",
      choices,
    });

    return response.template;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to select template: ${error.message}`);
    }
    throw new Error("Failed to select template");
  }
}

// We no longer need this function since projects are created during deployment

async function copyTemplateFiles(templateName: string, targetPath: string) {
  const templatePath = path.join(
    TEMPLATE_DIR,
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

interface AiAssistantOption {
  name: string;
  value: string;
  message: string;
  hint: string;
}

async function selectAiAssistants(): Promise<string[]> {
  const aiAssistantOptions: AiAssistantOption[] = [
    {
      name: "claude",
      value: "@gensx/claude-md",
      message: "Claude AI",
      hint: "Adds CLAUDE.md for Anthropic Claude integration",
    },
    {
      name: "cursor",
      value: "@gensx/cursor-rules",
      message: "Cursor",
      hint: "Adds Cursor IDE integration rules",
    },
    {
      name: "cline",
      value: "@gensx/cline-rules",
      message: "Cline",
      hint: "Adds Cline VS Code extension integration rules",
    },
    {
      name: "windsurf",
      value: "@gensx/windsurf-rules",
      message: "Windsurf",
      hint: "Adds Windsurf Cascade AI integration rules",
    },
  ];

  try {
    const prompter = enquirer as PromptModule;
    const response = await prompter.prompt<{ assistants: string[] }>({
      type: "multiselect",
      name: "assistants",
      message: "Select AI assistants to integrate with your project",
      choices: aiAssistantOptions.map((option) => ({
        name: option.name,
        value: option.value,
        message: `${option.message} ${pc.dim(`(${option.hint})`)}`,
      })),
      // Custom result function to return the actual values
      result(names: string[]) {
        // Convert selected names to their corresponding values
        return names.map(
          (name) =>
            aiAssistantOptions.find((opt) => opt.name === name)?.value ?? name,
        );
      },
    });

    return response.assistants;
  } catch (error) {
    if (error instanceof Error) {
      // If the user cancels the selection, return an empty array
      if (error.message.includes("canceled")) {
        return [];
      }
      throw new Error(`Failed to select AI assistants: ${error.message}`);
    }
    throw new Error("Failed to select AI assistants");
  }
}

export interface NewCommandOptions {
  template?: string;
  force: boolean;
  skipLogin?: boolean;
  skipIdeRules?: boolean;
  ideRules?: string;
  description?: string;
}

export async function newProject(
  projectPath: string,
  options: NewCommandOptions,
) {
  try {
    // Check if user has completed first-time setup
    const { state } = await readConfig();
    if (!state.hasCompletedFirstTimeSetup && !options.skipLogin) {
      // Ensure that we don't ask again.
      await saveState({ hasCompletedFirstTimeSetup: true });
      logger.log(
        pc.yellow("\nWelcome to GenSX! Let's get you set up first.\n"),
      );
      const { skipped } = await login();
      if (skipped) {
        logger.log(
          pc.dim(
            "\nNote: You can run 'gensx login' at any time to authenticate.",
          ),
        );
      }
    }

    const spinner = ora();
    let { template: templateName, force } = options;

    try {
      // Get available templates
      spinner.start("Loading available templates");
      const templates = await listTemplates();
      spinner.succeed();

      // If no template specified, show selection menu
      if (!templateName) {
        templateName = await selectTemplate();
      } else if (!templates.includes(templateName)) {
        spinner.fail();
        throw new Error(
          `Template "${templateName}" not found. Available templates: ${templates.join(", ")}`,
        );
      }

      // Load template
      spinner.start(
        `Loading template: ${pc.cyan(TEMPLATE_NAMES[templateName] || templateName)}`,
      );
      const template = await loadTemplate(templateName);
      spinner.succeed();

      const absoluteProjectPath = path.resolve(process.cwd(), projectPath);

      // Create and validate project directory
      spinner.start("Creating project directory");
      await mkdir(absoluteProjectPath, { recursive: true });
      spinner.succeed();

      const files = await readdir(absoluteProjectPath);
      if (files.length > 0 && !force) {
        spinner.fail();
        throw new Error(
          `Directory "${absoluteProjectPath}" is not empty. Use --force to overwrite existing files.`,
        );
      }
      spinner.succeed();

      // Create gensx.yaml configuration file with project name (required)
      spinner.start("Creating project configuration file");
      const projectName = path.basename(absoluteProjectPath);
      await saveProjectConfig(
        {
          name: projectName,
          description: options.description,
        },
        absoluteProjectPath,
      );
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

      // Handle AI assistant integrations
      if (options.ideRules) {
        // Parse comma-separated list of assistants
        const assistantMap: Record<string, string> = {
          claude: "@gensx/claude-md",
          cursor: "@gensx/cursor-rules",
          cline: "@gensx/cline-rules",
          windsurf: "@gensx/windsurf-rules",
        };

        const requestedAssistants = options.ideRules
          .split(",")
          .map((a) => a.trim().toLowerCase());
        const selectedAssistants = requestedAssistants
          .map((name) => assistantMap[name])
          .filter(Boolean);

        if (selectedAssistants.length > 0) {
          spinner.start("Installing AI assistant integrations");
          await exec(`npm install -D ${selectedAssistants.join(" ")}`);
          spinner.succeed();
          logger.log(
            pc.green(
              `\nSuccessfully installed ${selectedAssistants.length} AI assistant integration${
                selectedAssistants.length === 1 ? "" : "s"
              }.`,
            ),
          );
        }
      }
      // Interactive assistant selection if not skipped and not pre-specified
      else if (!options.skipIdeRules) {
        logger.log(
          pc.yellow(
            "\nWould you like to integrate with AI assistants? (Use space bar to select)",
          ),
        );
        logger.log(
          pc.dim(
            "These packages help AI assistants understand your GenSX project better.",
          ),
        );

        const selectedAssistants = await selectAiAssistants();

        if (selectedAssistants.length > 0) {
          spinner.start("Installing AI assistant integrations");
          await exec(`npm install -D ${selectedAssistants.join(" ")}`);
          spinner.succeed();
          logger.log(
            pc.green(
              `\nSuccessfully installed ${selectedAssistants.length} AI assistant integration${
                selectedAssistants.length === 1 ? "" : "s"
              }.`,
            ),
          );
        }
      }

      // Show success message
      console.info(`
${pc.green("✔")} Successfully created GenSX project in ${pc.cyan(absoluteProjectPath)}

To get started:
  ${projectPath !== "." ? pc.cyan(`cd ${projectPath}`) : ""}
  ${pc.cyan(template.runCommand)}

Edit ${pc.cyan("src/index.tsx")} to start building your GenSX application.

When ready to deploy:
  ${pc.cyan(`gensx deploy <file>`)}

Your project name "${pc.bold(projectName)}" has been saved to gensx.yaml and will be used for deployment.
`);
    } catch (error) {
      // If spinner is still spinning, stop it with failure
      if (spinner.isSpinning) {
        spinner.fail();
      }
      throw error;
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(pc.red(`\nError: ${error.message}`));
    } else {
      console.error(pc.red("\nAn unknown error occurred"));
    }
    process.exit(1);
  }
}
