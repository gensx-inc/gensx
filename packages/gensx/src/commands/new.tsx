import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { Box, Text, useApp } from "ink";
import SelectInput from "ink-select-input";
import Spinner from "ink-spinner";
import TextInput from "ink-text-input";
import { useCallback, useEffect, useState } from "react";

import { ErrorMessage } from "../components/ErrorMessage.js";
import { LoadingSpinner } from "../components/LoadingSpinner.js";
import { readConfig } from "../utils/config.js";
import { exec } from "../utils/exec.js";
import { saveProjectConfig } from "../utils/project-config.js";
import { login } from "./login.js";

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
  const [description, setDescription] = useState<string>("");
  const [_selectedAssistants, setSelectedAssistants] = useState<string[]>([]);
  const [hasCopiedFiles, setHasCopiedFiles] = useState(false);
  const [hasInstalledDeps, setHasInstalledDeps] = useState(false);
  const [isInstallingAssistants, setIsInstallingAssistants] = useState(false);

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
      setSelectedAssistants(assistants);
      setIsInstallingAssistants(true);

      // Filter out "all" and "none" from the assistants array
      const packagesToInstall = assistants.filter(
        (pkg) => pkg !== "all" && pkg !== "none",
      );

      // Run each assistant installation command using npx
      const installPromises = packagesToInstall.map((assistantPackage) =>
        exec(`npx ${assistantPackage}`, { cwd: projectPath }).catch(
          handleError,
        ),
      );

      Promise.all(installPromises)
        .then(() => {
          setIsInstallingAssistants(false);
          setPhase("done");
        })
        .catch(handleError);
    },
    [handleError, projectPath],
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

        // If description is provided in options, skip the createProject phase
        if (options.description) {
          setDescription(options.description);
          setPhase("copyFiles");
        } else {
          setPhase("createProject");
        }
      } catch (err) {
        handleError(err);
      }
    }

    void initialize();
  }, [handleError, options.skipLogin, options.description]);

  useEffect(() => {
    async function copyFiles() {
      if (phase === "copyFiles" && !hasCopiedFiles) {
        try {
          await copyTemplateFiles("ts", projectPath);

          // Save gensx.yaml config
          const projectName = path.basename(projectPath);
          await saveProjectConfig(
            {
              projectName,
              description: description || "My GenSX Project",
            },
            projectPath,
          );

          setHasCopiedFiles(true);
          setPhase("installDeps");
        } catch (err) {
          handleError(err);
        }
      }
    }
    void copyFiles();
  }, [phase, projectPath, handleError, hasCopiedFiles, description]);

  useEffect(() => {
    async function installDependencies() {
      if (phase === "installDeps" && !hasInstalledDeps) {
        try {
          const template = await loadTemplate("ts");

          if (template.dependencies.length > 0) {
            await exec(`npm install ${template.dependencies.join(" ")}`, {
              cwd: projectPath,
            });
          }

          if (template.devDependencies.length > 0) {
            await exec(`npm install -D ${template.devDependencies.join(" ")}`, {
              cwd: projectPath,
            });
          }

          setHasInstalledDeps(true);
          if (options.skipIdeRules) {
            setPhase("done");

            setTimeout(() => {
              exit();
            }, 100);
          } else {
            setPhase("selectAssistants");
          }
        } catch (err) {
          handleError(err);

          setTimeout(() => {
            exit();
          }, 100);
        }
      }
    }
    void installDependencies();
  }, [phase, handleError, hasInstalledDeps, options.skipIdeRules]);

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
            setPhase("createProject");
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
    return <LoadingSpinner message="Creating project..." />;
  }

  if (phase === "installDeps") {
    return (
      <Box flexDirection="column">
        <Text>
          <Text color="green" bold>
            ✔
          </Text>{" "}
          Created project
        </Text>
        <LoadingSpinner message="Installing dependencies..." />
      </Box>
    );
  }

  if (phase === "selectAssistants") {
    return (
      <Box flexDirection="column">
        <Text>
          <Text color="green" bold>
            ✔
          </Text>{" "}
          Created project
        </Text>
        <Text>
          <Text color="green" bold>
            ✔
          </Text>{" "}
          Installed dependencies
        </Text>
        <Box marginTop={1} flexDirection="column">
          <Text>
            <Text color="blue">➜</Text> Select AI assistants to integrate:
          </Text>
          {isInstallingAssistants ? (
            <LoadingSpinner message="Installing AI assistant integrations..." />
          ) : (
            <AiAssistantSelector onSelect={handleAssistantSelect} />
          )}
        </Box>
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
          Created project
        </Text>
        <Text>
          <Text color="green" bold>
            ✔
          </Text>{" "}
          Installed dependencies
        </Text>
        <Text>
          <Text color="green" bold>
            ✔
          </Text>{" "}
          Installed {_selectedAssistants.length} AI assistant integration
          {_selectedAssistants.length !== 1 ? "s" : ""}
        </Text>

        <Box>
          <Text>
            <Text color="green" bold>
              ✔
            </Text>{" "}
            Successfully created GenSX project in{" "}
            <Text color="cyan">{projectPath}</Text>
          </Text>
        </Box>

        <Box marginTop={2} flexDirection="column">
          <Text bold>NEXT STEPS:</Text>

          <Box marginTop={1}>
            <Text>1. Open the project directory:</Text>
            {projectPath !== "." && (
              <Text>
                {" "}
                <Text color="cyan">cd {projectPath}</Text>
              </Text>
            )}
          </Box>

          <Box marginTop={1} flexDirection="column">
            <Text>2. Choose what you want to do:</Text>

            <Box marginTop={1} marginLeft={2} flexDirection="column">
              <Text bold>DEPLOY THE PROJECT</Text>
              <Text>
                <Text color="cyan">
                  OPENAI_API_KEY=your_api_key npm run deploy
                </Text>
              </Text>
            </Box>

            <Box marginTop={1} marginLeft={2} flexDirection="column">
              <Text bold>RUN LOCALLY</Text>
              <Text>
                <Text color="cyan">
                  OPENAI_API_KEY=your_api_key npm run dev
                </Text>
              </Text>
            </Box>

            <Box marginTop={1} marginLeft={2} flexDirection="column">
              <Text bold>START API SERVER</Text>
              <Text>
                <Text color="cyan">
                  OPENAI_API_KEY=your_api_key npm run start
                </Text>
              </Text>
            </Box>
          </Box>

          <Box marginTop={2}>
            <Text>
              Open <Text color="cyan">src/workflows.tsx</Text> to start building
              your workflows.
            </Text>
          </Box>
        </Box>
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
      onSelect={(item: Item) => {
        const selection = item.value;
        if (selection === "none") {
          onSelect([]);
        } else if (selection === "all") {
          // For "all", get all the actual package values
          const allPackages = aiAssistantOptions
            .filter((opt) => opt.value !== "all" && opt.value !== "none")
            .map((opt) => opt.value);
          onSelect(allPackages);
        } else {
          onSelect([selection]);
        }
      }}
    />
  );
}

async function loadTemplate(_templateName: string): Promise<Template> {
  const templatePath = path.join(TEMPLATE_DIR, "typescript");
  const templateConfigPath = path.join(templatePath, "template.json");

  try {
    const configContent = await readFile(templateConfigPath, "utf-8");
    const template = JSON.parse(configContent) as Template;
    return template;
  } catch {
    throw new Error(`Template "typescript" not found or invalid.`);
  }
}

async function copyTemplateFiles(_templateName: string, targetPath: string) {
  const templatePath = path.join(TEMPLATE_DIR, "typescript");

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
