import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path, { resolve } from "node:path";

import { Box, Text, useApp } from "ink";
import { useCallback, useEffect, useRef, useState } from "react";
import * as ts from "typescript";
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
  const [serverLogs, setServerLogs] = useState<string[]>([]);
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
    // Find and parse tsconfig.json
    const tsconfigPath = resolve(process.cwd(), "tsconfig.json");
    if (!existsSync(tsconfigPath)) {
      throw new Error("Could not find tsconfig.json");
    }

    let tsconfig;
    try {
      const tsconfigContent = readFileSync(tsconfigPath, "utf-8");
      tsconfig = ts.parseJsonConfigFileContent(
        JSON.parse(tsconfigContent),
        ts.sys,
        process.cwd(),
      );
    } catch (error) {
      throw new Error(
        `Failed to parse tsconfig.json: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    // Get the output directory from tsconfig or use default
    const configOutDir = tsconfig.options.outDir ?? ".gensx/dist";

    // Create TypeScript program
    // Override noEmit and incremental to ensure files are actually written for gensx workflows
    // and avoid TS5074 error with incremental compilation in programmatic usage
    const compilerOptions = {
      ...tsconfig.options,
      noEmit: false,
      incremental: false,
      outDir: configOutDir,
    };
    const program = ts.createProgram([tsFile], compilerOptions);
    const sourceFile = program.getSourceFile(tsFile);

    if (!sourceFile) {
      throw new Error(`Could not find source file: ${tsFile}`);
    }

    const absoluteOutDir = resolve(process.cwd(), configOutDir);

    // Ensure output directory exists
    if (!existsSync(absoluteOutDir)) {
      mkdirSync(absoluteOutDir, { recursive: true });
    }

    // Compile the file
    const result = program.emit();
    const diagnostics = ts
      .getPreEmitDiagnostics(program)
      .concat(result.diagnostics);

    if (diagnostics.length > 0) {
      const formattedDiagnostics = ts.formatDiagnostics(diagnostics, {
        getCurrentDirectory: () => process.cwd(),
        getCanonicalFileName: (fileName) => fileName,
        getNewLine: () => "\n",
      });
      throw new Error(
        `TypeScript compilation failed:\n${formattedDiagnostics}`,
      );
    }

    // Get the actual output path that TypeScript generated
    // If rootDir is specified in tsconfig, use it, otherwise use the source file's directory
    const rootDir = tsconfig.options.rootDir ?? path.dirname(tsFile);
    const relativeToRootDir = path.relative(rootDir, tsFile);
    const actualOutputPath = path.join(
      absoluteOutDir,
      relativeToRootDir.replace(/\.tsx?$/, ".js"),
    );

    return actualOutputPath;
  }, []);

  const buildAndStartServer = useCallback(async () => {
    if (isRebuildingRef.current) {
      return;
    }

    isRebuildingRef.current = true;
    setIsRebuilding(true);

    try {
      if (currentServerRef.current) {
        // Add restart message
        setServerLogs((logs) => [
          ...logs,
          "",
          "🔄 Restarting server due to code changes...",
          "",
        ]);
        await currentServerRef.current.stop();
        // Add a short delay to allow the OS to release the port
        await new Promise((resolve) => setTimeout(resolve, 250));
        currentServerRef.current = null;
        setCurrentServer(null);
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

      setServerLogs([]);

      const server = createServer(
        workflows,
        {
          port: options.port ?? 1337,
          logger: {
            info: (msg) => {
              setServerLogs((logs) => [...logs, msg]);
            },
            error: (msg, err) => {
              const errorStr = err instanceof Error ? err.message : String(err);
              setServerLogs((logs) => [
                ...logs,
                `${msg}${err ? `: ${errorStr}` : ""}`,
              ]);
            },
            warn: (msg) => {
              setServerLogs((logs) => [...logs, msg]);
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

        // Add success message after restart
        if (serverLogs.length > 0) {
          // Only show for restarts, not first startup
          setServerLogs((logs) => [
            ...logs,
            "",
            "✅ Server restarted successfully!",
            `🚀 Server running at http://localhost:${options.port ?? 1337}`,
            "",
          ]);
        }
      } catch (err) {
        // Add visible error message
        setServerLogs((logs) => [
          ...logs,
          "",
          "❌ Error restarting server:",
          err instanceof Error ? err.message : String(err),
          "",
        ]);
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
    setServerLogs,
    exit,
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

      // Set rebuilding state to show spinner
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
          {(phase === "initial" ||
            phase === "compiling" ||
            phase === "generatingSchema" ||
            phase === "starting") && (
            <Box flexDirection="column">
              <LoadingSpinner message="Starting dev server..." />
            </Box>
          )}

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
              {serverLogs.length > 0 && (
                <Box flexDirection="column" paddingX={1} marginTop={1}>
                  <Box>
                    <Text>{serverLogs.slice(-20).join("\n")}</Text>
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </>
      )}
    </Box>
  );
};
