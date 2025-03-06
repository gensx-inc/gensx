import FormData from "form-data";
import ora from "ora";
import pc from "picocolors";
import { fetch } from "undici";

import { API_BASE_URL, getAuth } from "../utils/config.js";
import { readProjectConfig } from "../utils/project-config.js";
import { build } from "./build.js";

interface DeployOptions {
  project?: string;
  env?: string;
}

interface DeploymentResponse {
  url: string;
  id: string;
  projectName?: string;
}

export async function deploy(file: string, options: DeployOptions) {
  const spinner = ora();

  try {
    // 1. Build the workflow
    const outFile = await build(file);

    // 2. Get auth config
    const auth = await getAuth();
    if (!auth) {
      throw new Error("Not authenticated. Please run 'gensx login' first.");
    }

    let projectName = options.project;
    if (!projectName) {
      const projectConfig = await readProjectConfig();
      if (projectConfig?.name) {
        projectName = projectConfig.name;
        spinner.info(
          `Using project name from gensx.yaml: ${pc.cyan(projectName)}`,
        );
      } else {
        spinner.fail("No project name provided");
        throw new Error(
          "No project name found. Either specify --project or create a gensx.yaml file with a 'name' field.",
        );
      }
    }

    // 3. Create form data with bundle
    const form = new FormData();
    form.append("file", outFile);
    if (options.env) form.append("env", options.env);

    // Use the project-specific deploy endpoint
    const url = new URL(
      `/projects/${encodeURIComponent(projectName)}/deploy`,
      API_BASE_URL,
    );

    // 4. Deploy project to GenSX Cloud
    spinner.start(
      `Deploying project to GenSX Cloud (Project: ${pc.cyan(projectName)})`,
    );
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.token}`,
        ...form.getHeaders(),
      },
      body: form,
    });

    if (!response.ok) {
      throw new Error(
        `Failed to deploy: ${response.status} ${response.statusText}`,
      );
    }

    const deployment = (await response.json()) as DeploymentResponse;
    spinner.succeed();

    // 5. Show success message with deployment URL
    console.info(`
${pc.green("✔")} Successfully deployed project to GenSX Cloud

${pc.bold("Deployment URL:")} ${pc.cyan(deployment.url)}
${pc.bold("Dashboard:")} ${pc.cyan(`https://app.gensx.com/${auth.org}/${deployment.projectName}/deployments/${deployment.id}`)}
${pc.bold("Project:")} ${pc.cyan(deployment.projectName)}
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
