import {
  existsSync,
  mkdirSync,
  readFileSync,
  watch,
  writeFileSync,
} from "node:fs";
import path, { resolve } from "node:path";

import figures from "figures";
import { Box, Text, useApp } from "ink";
import Spinner from "ink-spinner"; // yarn add ink-spinner
import React, { useEffect, useState } from "react";
import * as ts from "typescript";

import { createServer } from "../dev-server.js";
import { generateSchema } from "../utils/schema.js";

interface Props {
  file: string;
  opts: {
    project?: string;
    environment?: string;
    quiet?: boolean;
    port?: number;
  };
}

type Phase =
  | "init"
  | "compile"
  | "schema"
  | "launch"
  | "watching"
  | "error"
  | "done";

export const StartUI: React.FC<Props> = ({ file, opts }) => {
  const { exit } = useApp();
  const [phase, setPhase] = useState<Phase>("init");
  const [msg, setMsg] = useState<string>("Booting Dev Server…");
  const [workflowList, setWorkflowList] = useState<
    { name: string; url: string }[]
  >([]);

  /** ---- helper that prints and flips phase ---------------------- */
  const step = (p: Phase, m: string) => {
    setPhase(p);
    setMsg(m);
  };

  /** ---- run once ------------------------------------------------ */
  useEffect(() => {
    let stopWatcher: (() => void) | null = null;
    let currentServer: { stop: () => void } | null = null;
    let rebuilding = false;

    void (async () => {
      try {
        const port = opts.port ?? 1337;
        const absolutePath = resolve(process.cwd(), file);

        // ── validate file ─────────────────────────────────────────
        if (!existsSync(absolutePath))
          throw new Error(`File '${file}' not found`);
        if (!/\.tsx?$/.exec(file))
          throw new Error("Only .ts or .tsx files are supported");

        const outDir = resolve(process.cwd(), ".gensx");
        if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

        /** -- compile TS ----------------------------------------- */
        const compile = (): string => {
          step("compile", `Compiling ${path.basename(file)} …`);
          const tsconfigPath = resolve(process.cwd(), "tsconfig.json");
          if (!existsSync(tsconfigPath))
            throw new Error("tsconfig.json not found");

          const tsconfig = ts.parseJsonConfigFileContent(
            JSON.parse(readFileSync(tsconfigPath, "utf8")),
            ts.sys,
            process.cwd(),
          );

          const program = ts.createProgram([absolutePath], tsconfig.options);
          const result = program.emit();
          const diagnostics = ts
            .getPreEmitDiagnostics(program)
            .concat(result.diagnostics);

          if (diagnostics.length) {
            const formatted = ts.formatDiagnostics(diagnostics, {
              getCurrentDirectory: () => process.cwd(),
              getCanonicalFileName: (f) => f,
              getNewLine: () => "\n",
            });
            throw new Error(formatted);
          }

          const rel = path.relative(process.cwd(), absolutePath);
          return path.join(
            tsconfig.options.outDir ?? ".gensx/dist",
            rel.replace(/\.tsx?$/, ".js"),
          );
        };

        /** -- build + (re)start server --------------------------- */
        const buildAndServe = async () => {
          if (rebuilding) return;
          rebuilding = true;
          if (currentServer) currentServer.stop();

          const jsPath = compile();

          step("schema", "Generating JSON-schema …");
          const schemas = generateSchema(absolutePath);
          writeFileSync(
            resolve(outDir, "schema.json"),
            JSON.stringify(schemas, null, 2),
          );

          step("launch", "Launching server …");
          const workflows = (await import(
            `file://${jsPath}?update=${Date.now()}`
          )) as Record<string, unknown>;

          const server = createServer(workflows, { port }, schemas).start();
          currentServer = {
            stop: () => {
              server.stop();
            },
          };
          setWorkflowList(server.getWorkflows());
          step("watching", `Dev server running at http://localhost:${port}`);
          rebuilding = false;
        };

        await buildAndServe();

        /** -- file watcher --------------------------------------- */
        const watcher = watch(path.dirname(absolutePath), { recursive: true });
        watcher.on("change", (_, fname) => {
          if (typeof fname === "string" && /\.tsx?$/.exec(fname)) {
            step("compile", "Change detected – rebuilding …");
            buildAndServe().catch((err: unknown) => {
              setPhase("error");
              setMsg(err instanceof Error ? err.message : String(err));
            });
          }
        });
        stopWatcher = () => {
          watcher.close();
        };
      } catch (err) {
        setPhase("error");
        setMsg(err instanceof Error ? err.message : String(err));
      }
    })();

    /** --- cleanup on exit -------------------------------------- */
    return () => {
      stopWatcher?.();
      exit();
    };
  }, [file, opts, exit]);

  /** ---- render -------------------------------------------------- */
  return (
    <Box flexDirection="column">
      {/* headline ------------------------------------------------ */}
      <Box>
        {phase !== "error" && <Spinner />}
        <Text color={phase === "error" ? "red" : undefined}> {msg}</Text>
      </Box>

      {/* workflow list once server is up ------------------------- */}
      {phase === "watching" && workflowList.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold>Available workflows:</Text>
          {workflowList.map((w) => (
            <Text key={w.name}>
              {figures.pointerSmall} {w.name} → {w.url}
            </Text>
          ))}
        </Box>
      )}

      {/* no workflows warning ----------------------------------- */}
      {phase === "watching" && workflowList.length === 0 && (
        <Text color="yellow">⚠ No workflows exported – check your file.</Text>
      )}

      {/* fatal error ------------------------------------------- */}
      {phase === "error" && (
        <Text color="red">
          {figures.cross} {msg}
        </Text>
      )}
    </Box>
  );
};
