import FormData from "form-data";
import ora from "ora";
import pc from "picocolors";
import { fetch } from "undici";

import { API_BASE_URL, getAuth } from "../utils/config.js";
import { ensureFirstTimeSetupComplete } from "../utils/first-time-setup.js";
import { readProjectConfig } from "../utils/project-config.js";
import { build } from "./build.js";

interface DeployOptions {
  name?: string;
  prod?: boolean;
  env?: string;
  project?: string;
  description?: string;
}

interface DeploymentResponse {
  url: string;
  id: string;
  projectName?: string;
}

export async function deploy(file: string, options: DeployOptions) {
  const spinner = ora();

  try {
    await ensureFirstTimeSetupComplete();

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
    if (options.name) form.append("name", options.name);
    if (options.prod) form.append("prod", "true");
    if (projectName) form.append("projectName", projectName);
    // Include description if provided
    if (options.description) form.append("description", options.description);

    // 4. Deploy to GenSX Cloud
    spinner.start(
      `Deploying to GenSX Cloud${projectName ? ` (Project: ${pc.cyan(projectName)})` : ""}`,
    );
    const url = new URL("/v1/deploy", API_BASE_URL);
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
${pc.green("✔")} Successfully deployed to GenSX Cloud

${pc.bold("Deployment URL:")} ${pc.cyan(deployment.url)}
${pc.bold("Dashboard:")} ${pc.cyan(`https://cloud.gensx.com/${auth.org}/deployments/${deployment.id}`)}
${deployment.projectName ? `${pc.bold("Project:")} ${pc.cyan(deployment.projectName)}` : ""}
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
