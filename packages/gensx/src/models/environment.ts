import { getAuth } from "../utils/config.js";
import { USER_AGENT } from "../utils/user-agent.js";
import { checkProjectExists } from "./projects.js";

interface ListEnvironmentsResponse {
  environments: {
    id: string;
    name: string;
    projectId: string;
    createdAt: string;
    updatedAt: string;
  }[];
}

/**
 * List environments for a project
 */
export async function listEnvironments(
  projectName: string,
): Promise<ListEnvironmentsResponse["environments"]> {
  const auth = await getAuth();
  if (!auth) {
    throw new Error("Not authenticated. Please run 'gensx login' first.");
  }

  const url = new URL(
    `/org/${auth.org}/projects/${encodeURIComponent(projectName)}/environments`,
    auth.apiBaseUrl,
  );

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${auth.token}`,
      "User-Agent": USER_AGENT,
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return [];
    }

    throw new Error(
      `Failed to list environments: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as ListEnvironmentsResponse;
  return data.environments;
}

interface CreateEnvironmentResponse {
  id: string;
  name: string;
}

/**
 * Create an environment for a project
 */
export async function createEnvironment(
  projectName: string,
  environmentName: string,
  { token, org, apiBaseUrl }: { token?: string; org?: string; apiBaseUrl?: string } = {},
): Promise<CreateEnvironmentResponse> {
  if (!token || !org) {
    const auth = await getAuth();
    if (!auth) {
    throw new Error("Not authenticated. Please run 'gensx login' first.");
  }

    token ??= auth.token;
    org ??= auth.org;
    apiBaseUrl ??= auth.apiBaseUrl;
  }

  // Check if the project exists
  const projectExists = await checkProjectExists(projectName, { token, org, apiBaseUrl });
  if (!projectExists) {
    throw new Error(`Project ${projectName} does not exist`);
  }

  // Check if the environment already exists
  const envExists = await checkEnvironmentExists(projectName, environmentName, { token, org, apiBaseUrl });
  if (envExists) {
    throw new Error(`Environment ${environmentName} already exists`);
  }

  const url = new URL(
    `/org/${org}/projects/${encodeURIComponent(projectName)}/environments`,
    apiBaseUrl ?? "https://api.gensx.com",
  );

  const body = {
    name: environmentName,
  };

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": USER_AGENT,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to create environment: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as CreateEnvironmentResponse;
  return data;
}

/**
 * Check if an environment exists for a project
 */
export async function checkEnvironmentExists(
  projectName: string,
  environmentName: string,
  { token, org, apiBaseUrl }: { token?: string; org?: string; apiBaseUrl?: string } = {},
): Promise<boolean> {
  if (!token || !org) {
    const auth = await getAuth();
    if (!auth) {
      throw new Error("Not authenticated. Please run 'gensx login' first.");
    }
    token ??= auth.token;
    org ??= auth.org;
    apiBaseUrl ??= auth.apiBaseUrl;
  }

  const url = new URL(
    `/org/${org}/projects/${encodeURIComponent(projectName)}/environments`,
    apiBaseUrl ?? "https://api.gensx.com",
  );

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to check environment: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as ListEnvironmentsResponse;
  const environments = data.environments;
  return environments.some((env) => env.name === environmentName);
}
