import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path, { resolve } from "node:path";

import { buildSync } from "esbuild";
import { Box, Text, useApp, useStdout } from "ink";
import { useCallback, useEffect, useRef, useState } from "react";
import { Definition } from "typescript-json-schema";

import { ErrorMessage } from "../components/ErrorMessage.js";
import { LoadingSpinner } from "../components/LoadingSpinner.js";
import { createServer } from "../dev-server.js";
import { generateSchema } from "../utils/schema.js";

export interface StartOptions {
  project?: string;
  environment?: string;
  quiet?: boolean;
  port?: number;
}

interface ServerInstance {
  stop: () => Promise<void>;
  getWorkflows: () => { name: string; url: string }[];
}

type Phase =
  | "initial"
  | "compiling"
  | "generatingSchema"
  | "starting"
  | "running"
  | "error";

interface Props {
  file: string;
  options: StartOptions;
}

export const StartUI: React.FC<Props> = ({ file, options }) => {
  const { exit } = useApp();
  const [phase, setPhase] = useState<Phase>("initial");
  const [error, setError] = useState<string | null>(null);
  const [currentServer, setCurrentServer] = useState<ServerInstance | null>(
    null,
  );
  const currentServerRef = useRef<ServerInstance | null>(null);
  const [_schemas, setSchemas] = useState<
    Record<string, { input: Definition; output: Definition }>
  >({});
  const isRebuildingRef = useRef(false);
  // Use Ink's stdout to stream log lines directly without triggering re-renders.
  const { stdout } = useStdout();
  const log = useCallback(
    (...parts: unknown[]) => {
      const line = parts
        .map((p) => (typeof p === "string" ? p : JSON.stringify(p, null, 2)))
        .join(" ");
      stdout.write(line + "\n");
    },
    [stdout],
  );
  const [isRebuilding, setIsRebuilding] = useState(false);

  // Keep currentServerRef synchronized with currentServer state
  useEffect(() => {
    currentServerRef.current = currentServer;
  }, [currentServer]);

  const handleError = useCallback(
    (err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setPhase("error");
      setTimeout(() => {
        exit();
      }, 100);
    },
    [exit],
  );

  const compileTypeScript = useCallback((tsFile: string): string => {
    // Always bundle the workflow and **all** its dependencies into a single
    // file using esbuild. Bundling guarantees that we don't rely on Node's
    // module cache for nested imports, which was the root cause of stale code
    // hanging around after a rebuild.

    const outDir = resolve(process.cwd(), ".gensx", "dist");
    if (!existsSync(outDir)) {
      mkdirSync(outDir, { recursive: true });
    }

    // Emit a unique filename every time to ensure a fresh evaluate step.
    const outfile = path.join(
      outDir,
      `${path.basename(tsFile).replace(/\.(ts|tsx)$/, "")}-${Date.now()}.mjs`,
    );

    try {
      buildSync({
        entryPoints: [tsFile],
        bundle: true,
        outfile,
        platform: "node",
        format: "esm",
        sourcemap: "inline",
        target: "esnext",
        tsconfig: existsSync(resolve(process.cwd(), "tsconfig.json"))
          ? resolve(process.cwd(), "tsconfig.json")
          : undefined,
        // Treat node_modules as external to keep bundle light, but include
        // local files so they're rebundled on change.
        packages: "external",
      });
    } catch (error) {
      throw new Error(
        `TypeScript compilation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return outfile;
  }, []);

  const buildAndStartServer = useCallback(async () => {
    if (isRebuildingRef.current) {
      return;
    }

    isRebuildingRef.current = true;
    setIsRebuilding(true);

    try {
      if (currentServerRef.current) {
        setPhase("compiling");
        await currentServerRef.current.stop();
        // Add a short delay to allow the OS to release the port
        await new Promise((resolve) => setTimeout(resolve, 250));
        currentServerRef.current = null;
        setCurrentServer(null);
      } else {
        log("Starting GenSX dev server...");
      }

      setPhase("compiling");
      const jsPath = compileTypeScript(file);

      setPhase("generatingSchema");
      const newSchemas = generateSchema(file);
      setSchemas(newSchemas);
      const schemaFile = resolve(process.cwd(), ".gensx", "schema.json");
      // Ensure .gensx directory exists
      const schemaDir = path.dirname(schemaFile);
      if (!existsSync(schemaDir)) {
        mkdirSync(schemaDir, { recursive: true });
      }
      writeFileSync(schemaFile, JSON.stringify(newSchemas, null, 2));

      setPhase("starting");
      const fileUrl = `file://${jsPath}?update=${Date.now().toString()}`;
      const workflows = (await import(fileUrl)) as Record<string, unknown>;

      // clear line buffer – not needed with direct stdout logging

      const server = createServer(
        workflows,
        {
          port: options.port ?? 1337,
          logger: {
            info: (msg, ...args) => {
              log(msg, ...args);
            },
            error: (msg, err) => {
              log(msg, err);
            },
            warn: (msg, ...args) => {
              log(msg, ...args);
            },
          },
        },
        newSchemas,
      );

      try {
        const serverInstance = server.start();
        currentServerRef.current = serverInstance;
        setCurrentServer(serverInstance);
        setPhase("running");
      } catch (err) {
        // Add visible error message
        log(
          "",
          "❌ Error restarting server:",
          err instanceof Error ? err.message : String(err),
        );
        // If this is an EADDRINUSE error, try to recover by forcibly stopping any server that might be lingering
        if (err instanceof Error && err.message.includes("EADDRINUSE")) {
          // Wait a bit longer to allow for port to potentially be released
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // Force reset our references
          currentServerRef.current = null;
          setCurrentServer(null);
        }

        throw err; // rethrow to the outer catch block
      }
    } catch (err) {
      handleError(err);
    } finally {
      isRebuildingRef.current = false;
      setIsRebuilding(false);
    }
  }, [
    file,
    options.port,
    compileTypeScript,
    handleError,
    setPhase,
    setCurrentServer,
    setSchemas,
    exit,
    log,
  ]);

  useEffect(() => {
    void buildAndStartServer();

    // Set up file watching
    const directoryToWatch = path.dirname(resolve(process.cwd(), file));
    let rebuildTimer: NodeJS.Timeout | null = null;

    const triggerRebuild = () => {
      if (rebuildTimer) {
        clearTimeout(rebuildTimer);
      }

      // Optional state flag
      setIsRebuilding(true);

      rebuildTimer = setTimeout(() => {
        void buildAndStartServer();
      }, 1000);
    };

    const fs = import("node:fs");
    void fs
      .then(({ watch }) => {
        const watcher = watch(directoryToWatch, (_eventType, filename) => {
          if (
            filename &&
            (filename.endsWith(".ts") || filename.endsWith(".tsx"))
          ) {
            triggerRebuild();
          }
        });

        return () => {
          watcher.close();
          if (rebuildTimer) {
            clearTimeout(rebuildTimer);
          }
          if (currentServerRef.current) {
            currentServerRef.current.stop().catch((err: unknown) => {
              console.error("Error stopping server:", err);
            });
          }
        };
      })
      .catch((err: unknown) => {
        handleError(err);
      });

    return () => {
      if (currentServerRef.current) {
        currentServerRef.current.stop().catch((err: unknown) => {
          console.error("Error stopping server:", err);
        });
      }
    };
  }, [file, options.port, buildAndStartServer, handleError]);

  if (error) {
    return <ErrorMessage message={error} />;
  }

  return (
    <Box flexDirection="column">
      {isRebuilding ? (
        <Box flexDirection="column">
          <LoadingSpinner message="Changes detected, rebuilding..." />
        </Box>
      ) : (
        <>
          {phase === "running" && (
            <Box flexDirection="column">
              <Box marginTop={1} flexDirection="row">
                <Box width={32}>
                  <Text>🚀 GenSX Dev Server running at</Text>
                </Box>
                <Box>
                  <Text color="cyan" bold>
                    http://localhost:{options.port ?? 1337}
                  </Text>
                </Box>
              </Box>
              <Box flexDirection="row">
                <Box width={32}>
                  <Text>🧪 Swagger UI available at</Text>
                </Box>
                <Box>
                  <Text color="cyan" bold>
                    http://localhost:{options.port ?? 1337}/swagger-ui
                  </Text>
                </Box>
              </Box>
              {currentServer && (
                <Box
                  flexDirection="column"
                  borderStyle="round"
                  borderColor="gray"
                  paddingX={1}
                  marginTop={1}
                >
                  <Text bold>Available workflows:</Text>
                  <Box
                    borderStyle="single"
                    borderColor="gray"
                    borderTop={false}
                    borderLeft={false}
                    borderRight={false}
                    paddingBottom={0}
                    marginBottom={0}
                  />
                  {currentServer.getWorkflows().map((workflow) => (
                    <Box key={workflow.name} flexDirection="row">
                      <Box width={24}>
                        <Text>{workflow.name}:</Text>
                      </Box>
                      <Box>
                        <Text color="cyan" bold>
                          {workflow.url}
                        </Text>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
              <Box marginTop={1}>
                <Text color="gray" dimColor>
                  Listening for changes... {new Date().toLocaleTimeString()}
                </Text>
              </Box>
            </Box>
          )}
        </>
      )}
    </Box>
  );
};
