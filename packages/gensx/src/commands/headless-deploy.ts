import type { DeployOptions } from "./deploy.js";

import fs, { existsSync } from "node:fs";
import { resolve } from "node:path";

import axios from "axios";
import FormData from "form-data";
import { Definition } from "typescript-json-schema";

import {
  checkEnvironmentExists,
  createEnvironment,
} from "../models/environment.js";
import { checkProjectExists } from "../models/projects.js";
import { getAuth } from "../utils/config.js";
import { readProjectConfig } from "../utils/project-config.js";
import { generateSchema } from "../utils/schema.js";
import { USER_AGENT } from "../utils/user-agent.js";
import { build } from "./build.js";

export async function headlessDeploy(
  file: string,
  options: DeployOptions & {
    outDir?: string;
    tsconfig?: string;
  },
) {
  let org = process.env.GENSX_ORG;
  let token = process.env.GENSX_API_KEY;
  let apiBaseUrl = process.env.GENSX_API_BASE_URL;
  let consoleBaseUrl = process.env.GENSX_CONSOLE_BASE_URL;

  if (!org || !token) {
    const authConfig = await getAuth();
    if (!authConfig) {
      throw new Error(
        "Not authenticated. Please specify GENSX_ORG and GENSX_API_KEY.",
      );
    }
    org ??= authConfig.org;
    token ??= authConfig.token;
    apiBaseUrl ??= authConfig.apiBaseUrl;
    consoleBaseUrl ??= authConfig.consoleBaseUrl;
  }

  // 1. Resolve project name
  let projectName = options.project;
  let environmentName = options.env;
  if (!projectName || !environmentName) {
    const projectConfig = await readProjectConfig(process.cwd());
    if (!projectName && !projectConfig?.projectName) {
      throw new Error(
        "No project name found. Either specify --project or create a gensx.yaml file with a 'projectName' field.",
      );
    }
    if (!environmentName && !projectConfig?.environmentName) {
      throw new Error(
        "No environment specified. Either specify --env or create a gensx.yaml file with an 'environmentName' field.",
      );
    }
    projectName ??= projectConfig?.projectName;
    environmentName ??= projectConfig?.environmentName;
  }

  // At this point, both projectName and environmentName are guaranteed to be defined
  // TypeScript: assert as string
  projectName = projectName!;
  environmentName = environmentName!;

  // 2. Validate project exists
  const projectExists = await checkProjectExists(projectName, {
    token,
    org,
    apiBaseUrl,
  });
  if (!projectExists) {
    throw new Error(`Project ${projectName} does not exist.`);
  }

  // 3. Validate environment exists
  const envExists = await checkEnvironmentExists(projectName, environmentName, {
    token,
    org,
    apiBaseUrl,
  });
  if (!envExists) {
    await createEnvironment(projectName, environmentName, {
      token,
      org,
      apiBaseUrl,
    });
  }

  // Only print the deployment message once, right before the API call
  console.info(
    `Deploying project '${projectName}' to environment '${environmentName}'...`,
  );

  // 4. Build or use archive
  let schemas: Record<string, { input: Definition; output: Definition }>;
  let bundleFile: string;
  if (options.archive) {
    bundleFile = options.archive;
    const archivePath = resolve(process.cwd(), bundleFile);
    if (!existsSync(archivePath)) {
      throw new Error(`Archive file ${bundleFile} does not exist`);
    }
    const absolutePath = resolve(process.cwd(), file);
    if (!existsSync(absolutePath)) {
      throw new Error(
        `Workflow file ${file} does not exist (needed for schema generation)`,
      );
    }
    schemas = generateSchema(absolutePath);
  } else {
    const buildResult = await build(
      file,
      {
        outDir: options.outDir,
        tsconfig: options.tsconfig,
        verbose: options.verbose,
      },
      options.verbose
        ? (data) => {
            console.info(data);
          }
        : undefined,
    );
    bundleFile = buildResult.bundleFile;
    schemas = buildResult.schemas;
  }

  // 5. Create form data with bundle
  const form = new FormData();
  form.append(
    "file",
    fs.createReadStream(resolve(process.cwd(), bundleFile)),
    "bundle.js",
  );
  if (options.envVar) {
    form.append("environmentVariables", JSON.stringify(options.envVar));
  }
  form.append("schemas", JSON.stringify(schemas));

  // 6. Deploy
  const url = new URL(
    `/org/${org}/projects/${encodeURIComponent(projectName)}/environments/${encodeURIComponent(environmentName)}/deploy`,
    apiBaseUrl ?? "https://api.gensx.com",
  );

  const response = await axios.post(url.toString(), form, {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": USER_AGENT,
    },
  });

  if (response.status >= 400) {
    throw new Error(
      `Failed to deploy: ${response.status} ${response.statusText}`,
    );
  }

  const deploymentData = response.data as {
    projectName: string;
    environmentName: string;
    environmentId: string;
    workflows: { name: string }[];
  };

  // 10. Print summary
  console.info("✅ Deployed to GenSX Cloud");
  console.info(`Project: ${deploymentData.projectName}`);
  console.info(`Environment: ${deploymentData.environmentName}`);
  console.info("Available Workflows:");
  for (const workflow of deploymentData.workflows) {
    console.info(`- ${workflow.name}`);
  }
  console.info(
    `Dashboard: ${consoleBaseUrl ?? "https://app.gensx.com"}/${org}/${deploymentData.projectName}?env=${deploymentData.environmentId}`,
  );
}
