import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { Box, Text, useApp } from "ink";
import SelectInput from "ink-select-input";
import Spinner from "ink-spinner";
import TextInput from "ink-text-input";
import pc from "picocolors";
import { useCallback, useEffect, useState } from "react";

import { ErrorMessage } from "../components/ErrorMessage.js";
import { readConfig } from "../utils/config.js";
import { exec } from "../utils/exec.js";
import { saveProjectConfig } from "../utils/project-config.js";
import { login } from "./login.js";

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

interface Item {
  label: string;
  value: string;
}

interface AiAssistantOption {
  name: string;
  value: string;
  message: string;
  hint: string;
}

type Phase =
  | "initial"
  | "login"
  | "selectTemplate"
  | "createProject"
  | "copyFiles"
  | "installDeps"
  | "selectAssistants"
  | "done"
  | "error";

export interface NewCommandOptions {
  template?: string;
  force: boolean;
  skipLogin?: boolean;
  skipIdeRules?: boolean;
  ideRules?: string;
  description?: string;
}

interface Props {
  projectPath: string;
  options: NewCommandOptions;
}

export function NewProjectUI({ projectPath, options }: Props) {
  const { exit } = useApp();
  const [phase, setPhase] = useState<Phase>("initial");
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<string[]>([]);
  const [_selectedTemplate, setSelectedTemplate] = useState<string | null>(
    null,
  );
  const [description, setDescription] = useState<string>("");
  const [_selectedAssistants, setSelectedAssistants] = useState<string[]>([]);
  const [hasCopiedFiles, setHasCopiedFiles] = useState(false);
  const [hasInstalledDeps, setHasInstalledDeps] = useState(false);

  const handleError = useCallback(
    (err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setPhase("error");
      setTimeout(() => {
        exit();
      }, 100);
    },
    [exit],
  );

  const loadTemplates = useCallback(async () => {
    try {
      const availableTemplates = await listTemplates();
      setTemplates(availableTemplates);
      return availableTemplates;
    } catch (err) {
      handleError(err);
      return [];
    }
  }, [handleError]);

  const handleTemplateSelect = useCallback(
    (template: string) => {
      try {
        setSelectedTemplate(template);
        setPhase("createProject");
      } catch (err) {
        handleError(err);
      }
    },
    [handleError],
  );

  const handleDescriptionSubmit = useCallback(
    (value: string) => {
      try {
        const trimmed = value.trim();
        setDescription(trimmed || "My GenSX Project");
        setPhase("copyFiles");
      } catch (err) {
        handleError(err);
      }
    },
    [handleError],
  );

  const handleAssistantSelect = useCallback(
    (assistants: string[]) => {
      try {
        setSelectedAssistants(assistants);
        setPhase("done");
      } catch (err) {
        handleError(err);
      }
    },
    [handleError],
  );

  useEffect(() => {
    async function initialize() {
      try {
        // Check if user has completed first-time setup
        const { state } = await readConfig();
        if (!state.hasCompletedFirstTimeSetup && !options.skipLogin) {
          setPhase("login");
          return;
        }

        // Load templates
        await loadTemplates();
        setPhase("selectTemplate");
      } catch (err) {
        handleError(err);
      }
    }

    void initialize();
  }, [loadTemplates, handleError, options.skipLogin]);

  useEffect(() => {
    async function copyFiles() {
      if (phase === "copyFiles" && !hasCopiedFiles) {
        try {
          await copyTemplateFiles(_selectedTemplate ?? "ts", projectPath);
          setHasCopiedFiles(true);
          setPhase("installDeps");
        } catch (err) {
          handleError(err);
        }
      }
    }
    void copyFiles();
  }, [phase, _selectedTemplate, projectPath, handleError, hasCopiedFiles]);

  useEffect(() => {
    async function installDependencies() {
      if (phase === "installDeps" && !hasInstalledDeps) {
        try {
          const template = await loadTemplate(_selectedTemplate ?? "ts");

          if (template.dependencies.length > 0) {
            await exec(`npm install ${template.dependencies.join(" ")}`);
          }

          if (template.devDependencies.length > 0) {
            await exec(`npm install -D ${template.devDependencies.join(" ")}`);
          }

          setHasInstalledDeps(true);
          setPhase("selectAssistants");
        } catch (err) {
          handleError(err);
        }
      }
    }
    void installDependencies();
  }, [phase, _selectedTemplate, handleError, hasInstalledDeps]);

  if (error) {
    return <ErrorMessage message={error} />;
  }

  if (phase === "login") {
    return (
      <Box flexDirection="column">
        <Text>
          <Text color="yellow">
            Welcome to GenSX! Let's get you set up first.
          </Text>
        </Text>
        <LoginUI
          onComplete={() => {
            setPhase("selectTemplate");
          }}
        />
      </Box>
    );
  }

  if (phase === "selectTemplate") {
    const items: Item[] = templates.map((flag) => ({
      label: TEMPLATE_NAMES[flag] || flag,
      value: flag,
    }));

    return (
      <Box flexDirection="column">
        <Text>
          <Text color="blue">➜</Text> Select a template:
        </Text>
        <SelectInput
          items={items}
          onSelect={(item) => {
            handleTemplateSelect(item.value);
          }}
        />
      </Box>
    );
  }

  if (phase === "createProject") {
    return (
      <Box flexDirection="column">
        <Text>
          <Text color="blue">➜</Text> Enter a project description (or press
          enter to skip):
        </Text>
        <TextInput
          value={description}
          onChange={setDescription}
          onSubmit={handleDescriptionSubmit}
        />
      </Box>
    );
  }

  if (phase === "copyFiles") {
    return (
      <Box>
        <Text>
          <Spinner /> Creating project...
        </Text>
      </Box>
    );
  }

  if (phase === "installDeps") {
    return (
      <Box>
        <Text>
          <Spinner /> Installing dependencies...
        </Text>
      </Box>
    );
  }

  if (phase === "selectAssistants") {
    return (
      <Box flexDirection="column">
        <Text>
          <Text color="blue">➜</Text> Select AI assistants to integrate:
        </Text>
        <AiAssistantSelector onSelect={handleAssistantSelect} />
      </Box>
    );
  }

  if (phase === "done") {
    return (
      <Box flexDirection="column">
        <Text>
          <Text color="green" bold>
            ✔
          </Text>{" "}
          Project created successfully!
        </Text>
        <Text>Next steps:</Text>
        <Text>1. cd {projectPath}</Text>
        <Text>2. npm run dev</Text>
      </Box>
    );
  }

  return null;
}

interface LoginUIProps {
  onComplete: () => void;
}

function LoginUI({ onComplete }: LoginUIProps) {
  const { skipped } = login();
  useEffect(() => {
    if (skipped) {
      onComplete();
    }
  }, [skipped, onComplete]);

  return (
    <Box>
      <Text>
        <Spinner /> Logging in...
      </Text>
    </Box>
  );
}

interface AiAssistantSelectorProps {
  onSelect: (assistants: string[]) => void;
}

function AiAssistantSelector({ onSelect }: AiAssistantSelectorProps) {
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
    {
      name: "all",
      value: "all",
      message: "All",
      hint: "Adds all AI assistants",
    },
    {
      name: "none",
      value: "none",
      message: "None",
      hint: "No AI assistants will be installed",
    },
  ];

  const items: Item[] = aiAssistantOptions.map((option) => ({
    label: `${option.message} (${option.hint})`,
    value: option.value,
  }));

  return (
    <SelectInput
      items={items}
      onSelect={(item) => {
        const selection = item.value;
        if (selection === "none") {
          onSelect([]);
        } else if (selection === "all") {
          onSelect(aiAssistantOptions.map((opt) => opt.value));
        } else {
          onSelect([selection]);
        }
      }}
    />
  );
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
  } catch {
    throw new Error(`Template "${templateName}" not found or invalid.`);
  }
}

async function listTemplates(): Promise<string[]> {
  try {
    const templates = await readdir(TEMPLATE_DIR);
    return Object.entries(TEMPLATE_MAP)
      .filter(([_, dir]) => templates.includes(dir))
      .map(([flag]) => flag);
  } catch {
    return [];
  }
}

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

export async function newProject(
  projectPath: string,
  options: NewCommandOptions,
) {
  try {
    const absoluteProjectPath = path.resolve(projectPath);

    // Create and validate project directory
    await mkdir(absoluteProjectPath, { recursive: true });

    const files = await readdir(absoluteProjectPath);
    if (files.length > 0 && !options.force) {
      throw new Error(
        `Directory "${absoluteProjectPath}" is not empty. Use --force to overwrite existing files.`,
      );
    }

    // Initialize npm project and install dependencies
    process.chdir(absoluteProjectPath);
    await exec("npm init -y");

    const template = await loadTemplate(options.template ?? "ts");
    if (template.dependencies.length > 0) {
      await exec(`npm install ${template.dependencies.join(" ")}`);
    }

    if (template.devDependencies.length > 0) {
      await exec(`npm install -D ${template.devDependencies.join(" ")}`);
    }

    // Handle AI assistant integrations
    if (options.ideRules) {
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
        for (const assistantPackage of selectedAssistants) {
          await exec(`npx ${assistantPackage}`);
        }
      }
    }

    // Save project configuration
    const projectName = path.basename(absoluteProjectPath);
    await saveProjectConfig(
      {
        projectName,
        ...(options.description && { description: options.description }),
      },
      absoluteProjectPath,
    );

    return {
      projectName,
      projectPath: absoluteProjectPath,
    };
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(pc.red(`\nError: ${error.message}`), error.stack);
    } else {
      console.error(pc.red("\nAn unknown error occurred"));
    }
    process.exit(1);
  }
}
