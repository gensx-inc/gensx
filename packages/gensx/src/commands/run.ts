import { createWriteStream, WriteStream } from "node:fs";
import { writeFile } from "node:fs/promises";

import ora from "ora";
import pc from "picocolors";

import { getAuth } from "../utils/config.js";
import { readProjectConfig } from "../utils/project-config.js";
import { USER_AGENT } from "../utils/user-agent.js";

export async function runWorkflow(
  workflow: string,
  options: { input: string; wait: boolean; project?: string; output?: string },
) {
  const spinner = ora();

  try {
    const { input, wait, output: outputFile } = options;
    if (outputFile && !wait) {
      console.warn(
        "Output file cannot be specified without waiting for the workflow to finish.",
      );
      process.exit(1);
    }
    const inputJson = JSON.parse(input) as Record<string, unknown>;

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
          "No project name found. Either specify --project or create a gensx.yaml file with a 'name' field.",
        );
      }
    }

    if (!wait) {
      spinner.start("Starting workflow execution");
      const url = new URL(
        `/org/${auth.org}/projects/${projectName}/workflows/${encodeURIComponent(workflow)}/start`,
        auth.apiBaseUrl,
      );

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
          "User-Agent": USER_AGENT,
        },
        body: JSON.stringify({ input: inputJson }),
      });

      if (response.status >= 400) {
        throw new Error(
          `Failed to start workflow: ${response.status} ${response.statusText}`,
        );
      }

      const body = (await response.json()) as {
        status: "ok";
        data: { executionId: string };
      };

      spinner.succeed();

      console.info(
        `Workflow execution started with id: ${pc.cyan(body.data.executionId)}`,
      );
    } else {
      spinner.start("Running workflow");

      const url = new URL(
        `/org/${auth.org}/projects/${projectName}/workflows/${encodeURIComponent(workflow)}/run`,
        auth.apiBaseUrl,
      );
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
          "User-Agent": USER_AGENT,
        },
        body: JSON.stringify({ input: inputJson }),
      });

      if (response.status >= 400) {
        throw new Error(
          `Failed to start workflow: ${response.status} ${response.statusText}`,
        );
      }

      spinner.succeed();

      const responseHeaders = response.headers;
      if (responseHeaders.get("Content-Type")?.includes("stream")) {
        const stream = response.body?.getReader();
        if (!stream) {
          throw new Error("No stream returned");
        }

        if (outputFile) {
          console.info(`Streaming response output to ${pc.cyan(outputFile)}`);
        } else {
          console.info("Streaming response output:");
        }
        const decoder = new TextDecoder();

        let fileStream: WriteStream | undefined;
        if (outputFile) {
          fileStream = createWriteStream(outputFile);
        }

        let isDone = false;

        while (!isDone) {
          const result = await stream.read();
          if (result.done) {
            isDone = true;
          } else if (result.value) {
            if (fileStream) {
              fileStream.write(decoder.decode(result.value as ArrayBuffer));
            } else {
              process.stdout.write(decoder.decode(result.value as ArrayBuffer));
            }
          }
        }
        if (fileStream) {
          fileStream.end();
        }
        console.info("\n\nWorkflow execution completed");
      } else {
        const body = (await response.json()) as {
          status: "ok";
          data: {
            output: unknown;
            status: "success" | "failed";
            stdout?: string;
            stderr?: string;
          };
        };
        if (body.data.status === "failed") {
          console.error("Workflow failed");
          if (body.data.stderr) {
            console.error("Stderr:", body.data.stderr);
          }
          if (body.data.stdout) {
            console.error("Stdout:", body.data.stdout);
          }
          if (body.data.output) {
            console.error("Output:", JSON.stringify(body.data.output, null, 2));
          }
          process.exit(1);
        }

        if (outputFile) {
          await writeFile(
            outputFile,
            JSON.stringify(body.data.output, null, 2),
          );
          console.info(`Workflow output written to ${pc.cyan(outputFile)}`);
        } else {
          console.info("Workflow execution completed, here is the output:");
          console.info(JSON.stringify(body.data.output, null, 2));
        }
      }
    }
  } catch (error) {
    spinner.fail();
    console.error(error);
  }
}
