import fs from "node:fs";

import axios from "axios";
import FormData from "form-data";
import ora from "ora";
import pc from "picocolors";

import { getAuth } from "../utils/config.js";
import { getEnvironmentForOperation } from "../utils/env-config.js";
import { readProjectConfig } from "../utils/project-config.js";
import { USER_AGENT } from "../utils/user-agent.js";
import { build } from "./build.js";

interface DeployOptions {
  project?: string;
  envVar?: string[];
  env?: string;
}

interface DeploymentResponse {
  id: string;
  projectId: string;
  projectName: string;
  environmentId: string;
  environmentName: string;
  buildId: string;
  bundleSize: number;
  workflows: {
    id: string;
    name: string;
    inputSchema: object;
    outputSchema: object;
  }[];
}

export async function deploy(file: string, options: DeployOptions) {
  const spinner = ora({ discardStdin: false });

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

    // Get environment using the utility function - user will either confirm or select environment
    const environmentName = await getEnvironmentForOperation(
      projectName,
      options.env,
      spinner,
      true,
    );

    // 4. Create form data with bundle
    const form = new FormData();
    form.append("file", fs.createReadStream(bundleFile), "bundle.js");
    if (options.envVar) {
      form.append("environmentVariables", JSON.stringify(options.envVar));
    }

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

    const deploymentIdOption = deployment.buildId
      ? `deploymentId=${deployment.buildId}`
      : "";

    // 6. Show success message with deployment URL
    console.info(`
${pc.green("✔")} Successfully deployed project to GenSX Cloud

${pc.bold("Dashboard:")} ${pc.cyan(`${auth.consoleBaseUrl}/${auth.org}/${deployment.projectName}/${deployment.environmentName}/workflows?${deploymentIdOption}`)}

${pc.bold("Available workflows:")}
${deployment.workflows
  .map((workflow) => pc.cyan("- " + workflow.name))
  .join("\n")}

${pc.bold("Project:")} ${pc.cyan(deployment.projectName)}
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
