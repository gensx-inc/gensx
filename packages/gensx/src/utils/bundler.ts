import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import { OutputOptions, Plugin, rollup, RollupOptions } from "rollup";

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
    transform(code: string, id: string) {
      // Transform process.env access to Deno.env.get calls
      let transformedCode = code
        .replace(/__dirname/g, '(new URL(".", import.meta.url).pathname)')
        .replace(/__filename/g, "import.meta.url")
        // Do this song and dance to replace process.env calls with something compatible with Deno.env.get that does not throw an error.
        .replace(
          /process\.env\[(['"`])(.*?)\1\]/g,
          "((() => { try { return Deno.env.get($1$2$1) } catch { return undefined } })())",
        )
        .replace(
          /process\.env\.([\w]+)/g,
          '((() => { try { return Deno.env.get("$1") } catch { return undefined } })())',
        )
        // Add a process.env getter for compatibility
        .replace(
          /process\.env(?!\s*=|\s*\.)/g,
          "(new Proxy({}, { get: (_, prop) => { try { return Deno.env.get(String(prop)) } catch { return undefined } } }))",
        );

      return {
        code: transformedCode,
        map: { mappings: "", sources: [id], names: [] },
      };
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
        jsxImportSource: "gensx",
        tsconfig: "./tsconfig.json",
        sourceMap: false,
      }),
      denoCompat(),
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
  outFile: string,
  watch = false,
) {
  const options = getRollupConfig(workflowPath, outFile, watch);
  const bundle = await rollup(options);
  return bundle.write(options.output as OutputOptions);
}
