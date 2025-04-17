import fs from "node:fs";

import axios from "axios";
import enquirer from "enquirer";
import FormData from "form-data";
import ora from "ora";
import pc from "picocolors";

import { createEnvironment, listEnvironments } from "../models/environment.js";
import { checkProjectExists, createProject } from "../models/projects.js";
import { PromptModule } from "../types/prompt.js";
import { getAuth } from "../utils/config.js";
import { getSelectedEnvironment } from "../utils/env-config.js";
import { readProjectConfig } from "../utils/project-config.js";
import { USER_AGENT } from "../utils/user-agent.js";
import { build } from "./build.js";

interface DeployOptions {
  project?: string;
  env?: string[];
  environment?: string;
}

interface DeploymentResponse {
  status: "ok";
  data: {
    id: string;
    projectId: string;
    projectName: string;
    deploymentId: string;
    bundleSize: number;
    workflows: {
      id: string;
      name: string;
      inputSchema: object;
      outputSchema: object;
    }[];
  };
}

/**
 * Get the environment to deploy to, either from options, saved config, or user selection
 */
export async function getDeploymentEnvironment(
  projectName: string,
  projectExists: boolean,
  specifiedEnvironment?: string,
): Promise<string> {
  const spinner = ora();

  // If environment is explicitly specified, use it
  if (specifiedEnvironment) {
    return specifiedEnvironment;
  }

  // Try to get the selected environment
  const selectedEnvironment = await getSelectedEnvironment(projectName);

  if (selectedEnvironment) {
    // Confirm with user
    spinner.stop();
    const prompter = enquirer as PromptModule;
    const useSelected = await prompter
      .prompt<{ confirm: boolean }>({
        type: "confirm",
        name: "confirm",
        message: `Use selected environment ${pc.cyan(selectedEnvironment)}?`,
        initial: true,
      })
      .then((result) => result.confirm)
      .catch(() => false);

    if (useSelected) {
      spinner.info(
        `Using selected environment: ${pc.cyan(selectedEnvironment)}`,
      );
      return selectedEnvironment;
    }
  }

  // If we don't have an environment yet, prompt to select or create one
  spinner.start("Fetching available environments...");
  const environments = projectExists ? await listEnvironments(projectName) : [];
  spinner.stop();

  // If there are existing environments, show a select prompt
  if (environments.length > 0) {
    const prompter = enquirer as PromptModule;
    const choices = [
      ...environments.map((env) => ({ name: env.name, value: env.name })),
      { name: "Create a new environment", value: "Create a new environment" },
    ];

    const selection = await prompter
      .prompt<{ environment: string }>({
        type: "select",
        name: "environment",
        message: "Select an environment to use:",
        choices,
      })
      .then((result) => result.environment)
      .catch(() => null);

    if (selection === "Create a new environment") {
      // Create a new environment
      const newEnvName = await prompter
        .prompt<{ name: string }>({
          type: "input",
          name: "name",
          message: "Enter a name for the new environment:",
          validate: (value: string) =>
            value.trim() !== "" || "Environment name cannot be empty",
        })
        .then((result) => result.name)
        .catch(() => null);

      if (newEnvName) {
        if (!projectExists) {
          spinner.start(
            `Creating project ${pc.cyan(projectName)} and environment ${pc.cyan(newEnvName)}...`,
          );
          await createProject(projectName, newEnvName);
          spinner.succeed(
            `Project ${pc.cyan(projectName)} and environment ${pc.cyan(
              newEnvName,
            )} created`,
          );
        } else {
          spinner.start(`Creating environment ${pc.cyan(newEnvName)}...`);
          await createEnvironment(projectName, newEnvName);
          spinner.succeed(`Environment ${pc.cyan(newEnvName)} created`);
        }

        return newEnvName;
      } else {
        throw new Error("Environment creation cancelled");
      }
    } else if (selection) {
      return selection;
    } else {
      throw new Error("Environment selection cancelled");
    }
  } else {
    // No environments exist, prompt to create one
    const prompter = enquirer as PromptModule;
    const newEnvName = await prompter
      .prompt<{ name: string }>({
        type: "input",
        name: "name",
        message: "No environments found. Enter a name for a new environment:",
        initial: "default",
        validate: (value: string) =>
          value.trim() !== "" || "Environment name cannot be empty",
      })
      .then((result) => result.name)
      .catch(() => "default");

    if (!projectExists) {
      spinner.start(
        `Creating project ${pc.cyan(projectName)} and environment ${pc.cyan(
          newEnvName,
        )}...`,
      );
      await createProject(projectName, newEnvName);
      spinner.succeed(
        `Project ${pc.cyan(projectName)} and environment ${pc.cyan(newEnvName)} created`,
      );
    } else {
      spinner.start(`Creating environment ${pc.cyan(newEnvName)}...`);
      await createEnvironment(projectName, newEnvName);
      spinner.succeed(`Environment ${pc.cyan(newEnvName)} created`);
    }

    return newEnvName;
  }
}

export async function deploy(file: string, options: DeployOptions) {
  const spinner = ora();

  try {
    // 1. Build the workflow
    const { bundleFile, schemas } = await build(file);

    // 2. Get auth config
    const auth = await getAuth();
    if (!auth) {
      throw new Error("Not authenticated. Please run 'gensx login' first.");
    }

    let projectName = options.project;
    const projectConfig = await readProjectConfig(process.cwd());
    if (!projectName) {
      if (projectConfig?.projectName) {
        projectName = projectConfig.projectName;
        spinner.info(
          `Using project name from gensx.yaml: ${pc.cyan(projectName)}`,
        );
      } else {
        spinner.fail("No project name provided");
        throw new Error(
          "No project name found. Either specify --project or create a gensx.yaml file with a 'projectName' field.",
        );
      }
    }

    // Check if the project exists
    const projectExists = await checkProjectExists(projectName);

    // 3. Get the environment to deploy to
    const environmentName = await getDeploymentEnvironment(
      projectName,
      projectExists,
      options.environment,
    );

    // 4. Create form data with bundle
    const form = new FormData();
    form.append("file", fs.createReadStream(bundleFile), "bundle.js");
    if (options.env)
      form.append("environmentVariables", JSON.stringify(options.env));

    form.append("schemas", JSON.stringify(schemas));

    // Use the project-specific deploy endpoint
    const url = new URL(
      `/org/${auth.org}/projects/${encodeURIComponent(projectName)}/environments/${encodeURIComponent(environmentName)}/deploy`,
      auth.apiBaseUrl,
    );

    // 5. Deploy project to GenSX Cloud
    spinner.start(
      `Deploying project ${pc.cyan(projectName)} to GenSX Cloud (Environment: ${pc.cyan(environmentName)})`,
    );

    const response = await axios.post(url.toString(), form, {
      headers: {
        Authorization: `Bearer ${auth.token}`,
        "User-Agent": USER_AGENT,
      },
    });

    if (response.status >= 400) {
      throw new Error(
        `Failed to deploy: ${response.status} ${response.statusText}`,
      );
    }

    const deployment = response.data as DeploymentResponse;

    spinner.succeed();

    // 6. Show success message with deployment URL
    console.info(`
${pc.green("✔")} Successfully deployed project to GenSX Cloud

${pc.bold("Dashboard:")} ${pc.cyan(`${auth.consoleBaseUrl}/${auth.org}/${deployment.data.projectName}/deployments/${deployment.data.deploymentId}`)}

${pc.bold("Available workflows:")}
${deployment.data.workflows
  .map((workflow) => pc.cyan("- " + workflow.name))
  .join("\n")}

${pc.bold("Project:")} ${pc.cyan(deployment.data.projectName)}
${pc.bold("Environment:")} ${pc.cyan(environmentName)}
`);
  } catch (error) {
    if (spinner.isSpinning) {
      spinner.fail();
    }

    if (error instanceof Error) {
      const errorMessage = error.message;

      // Check for project not found error with suggestions
      if (errorMessage.includes("Did you mean one of these?")) {
        console.error(pc.red("\nProject not found"));
        console.error(pc.yellow(errorMessage));

        console.info(`\nYou can specify a project name with:
  ${pc.cyan(`gensx deploy <file> --project <project-name>`)}
`);
      } else {
        console.error(pc.red(`\nError: ${errorMessage}`));
      }
    } else {
      console.error(pc.red("\nAn unknown error occurred"));
    }

    process.exit(1);
  }
}
