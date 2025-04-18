import fs from "node:fs";

import axios from "axios";
import FormData from "form-data";
import ora from "ora";
import pc from "picocolors";

import { getAuth } from "../utils/config.js";
import { readProjectConfig } from "../utils/project-config.js";
import { USER_AGENT } from "../utils/user-agent.js";
import { build } from "./build.js";
interface DeployOptions {
  project?: string;
  env?: string[];
}

interface DeploymentResponse {
  status: "ok";
  data: {
    id: string;
    projectId: string;
    projectName: string;
    environmentId: string;
    environmentName: string;
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
    if (!projectName) {
      const projectConfig = await readProjectConfig(process.cwd());
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

    // 3. Create form data with bundle
    const form = new FormData();
    form.append("file", fs.createReadStream(bundleFile), "bundle.js");
    if (options.env)
      form.append("environmentVariables", JSON.stringify(options.env));

    form.append("schemas", JSON.stringify(schemas));

    // Use the project-specific deploy endpoint
    const url = new URL(
      `/org/${auth.org}/projects/${encodeURIComponent(projectName)}/deploy`,
      auth.apiBaseUrl,
    );

    // 4. Deploy project to GenSX Cloud
    spinner.start(
      `Deploying project to GenSX Cloud (Project: ${pc.cyan(projectName)})`,
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

    const deploymentIdOption = deployment.data.deploymentId
      ? `deploymentId=${deployment.data.deploymentId}`
      : "";

    // 5. Show success message with deployment URL
    console.info(`
${pc.green("✔")} Successfully deployed project to GenSX Cloud

${pc.bold("Dashboard:")} ${pc.cyan(`${auth.consoleBaseUrl}/${auth.org}/${deployment.data.projectName}/${deployment.data.environmentName}/workflows?${deploymentIdOption}`)}

${pc.bold("Available workflows:")}
${deployment.data.workflows
  .map((workflow) => pc.cyan("- " + workflow.name))
  .join("\n")}

${pc.bold("Project:")} ${pc.cyan(deployment.data.projectName)}
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
