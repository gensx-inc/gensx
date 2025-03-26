import { spawn } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { existsSync } from "node:fs";
import path from "node:path";

import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import builtinModules from "builtin-modules";
import { findUp } from "find-up";
import { Plugin, RollupOptions } from "rollup";

type NodeBuiltins = Record<string, string>;

// More comprehensive Node.js compatibility layer
function denoCompat(): Plugin {
  // We can remove most of these shims since Deno provides them natively
  // Only keep custom implementations for things Deno doesn't fully support
  const nodeBuiltins: NodeBuiltins = {
    // Remove most shims and let Deno handle them
  };

  return {
    name: "deno-compat",
    resolveId(source: string) {
      // Handle node: prefixed modules
      if (source.startsWith("node:")) {
        return source; // Let Deno handle it
      }
      if (builtinModules.includes(source)) {
        return `node:${source}`;
      }
      const normalizedSource = source.replace(/^node:/, "");
      if (normalizedSource in nodeBuiltins) {
        return source;
      }
      return null;
    },
    load(id: string) {
      const normalizedId = id.replace(/^node:/, "");
      const code = nodeBuiltins[normalizedId];
      if (code) {
        return {
          code,
          map: { mappings: "" },
        };
      }
      return null;
    },
  };
}

export function getRollupConfig(
  workflowPath: string,
  outFile: string,
  watch = false,
): RollupOptions {
  return {
    input: workflowPath,
    ...(watch && {
      watch: {
        include: ["src/**", "components/**", "*.ts", "*.tsx"],
        exclude: ["node_modules/**", ".gensx/**"],
        clearScreen: false,
      },
    }),
    onwarn(warning, warn) {
      // Ignore sourcemap warnings
      if (
        warning.message.includes("Can't resolve original location of error")
      ) {
        return;
      }
      // Ignore 'this' rewriting warnings
      if (
        warning.message.includes(
          "The 'this' keyword is equivalent to 'undefined'",
        )
      ) {
        return;
      }

      if (warning.code === "CIRCULAR_DEPENDENCY") {
        return;
      }
      // Forward other warnings to default handler
      warn(warning);
    },
    plugins: [
      nodeResolve({
        preferBuiltins: false,
        browser: false,
        mainFields: ["module", "main"],
        resolveOnly: [/.*/],
      }),
      // @ts-expect-error - This is a known issue with rollup-plugin-commonjs
      commonjs({
        transformMixedEsModules: true,
        ignore: ["node:*"],
        requireReturnsDefault: "auto",
        esmExternals: false,
        sourceMap: false,
      }),
      // @ts-expect-error - This is a known issue with rollup-plugin-typescript
      typescript({
        jsx: "react-jsx",
        jsxImportSource: "@gensx/core",
        tsconfig: "./tsconfig.json",
        sourceMap: false,
      }),
      denoCompat(),
      // @ts-expect-error - This is a known issue with rollup-plugin-json
      json(),
    ],
    external: [/^https:\/\/deno\.land\/std\/.*/, /^node:.*/],
    output: {
      format: "esm",
      file: outFile,
      inlineDynamicImports: true,
      sourcemap: false,
      hoistTransitiveImports: false,
      preserveModules: false,
      interop: "auto",
      generatedCode: {
        constBindings: true,
      },
    },
  };
}

export async function bundleWorkflow(
  workflowPath: string,
  outDir: string,
  _watch = false,
) {
  // remove anything in the outDir
  if (existsSync(outDir)) {
    rmSync(outDir, { recursive: true, force: true });
  } else {
    mkdirSync(outDir, { recursive: true });
  }

  // run the gensx-bundler docker container, and mount the closest directory to the workflow path that contains a package.json
  // also mount the output directory

  // find the closest directory to the workflow path that contains a package.json
  const packageJsonPath = await findUp("package.json", {
    cwd: path.dirname(workflowPath),
  });

  if (!packageJsonPath) {
    throw new Error("No package.json found");
  }

  const packageJsonDir = path.dirname(packageJsonPath);
  const relativeWorkflowPath = path.relative(packageJsonDir, workflowPath);

  let stdout = "";
  let stderr = "";
  try {
    await new Promise<void>((resolve, reject) => {
      const process = spawn("docker", [
        "run",
        "--rm",
        "-v",
        `${packageJsonDir}:/app`,
        "-v",
        `${outDir}:/dist`,
        "-e",
        `WORKFLOW_PATH=${relativeWorkflowPath}`,
        "gensx-bundler",
      ]);
      process.stdout.on("data", (data: Buffer) => {
        stdout += data.toString();
      });

      process.stderr.on("data", (data: Buffer) => {
        stderr += data.toString();
      });

      process.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(`Bundler exited with code ${code}`));
        }
        resolve();
      });
    });
  } catch (error) {
    console.error("Error bundling workflow", error);
    console.error("Stdout:\n", stdout);
    console.error("Stderr:\n", stderr);
    throw error;
  }
}
