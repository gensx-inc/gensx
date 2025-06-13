module.exports = {

"[project]/examples/draft-pad/.next-internal/server/app/api/gensx/route/actions.js [app-rsc] (server actions loader, ecmascript)": (function(__turbopack_context__) {

var { g: global, __dirname, m: module, e: exports } = __turbopack_context__;
{
}}),
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)": (function(__turbopack_context__) {

var { g: global, __dirname, m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)": (function(__turbopack_context__) {

var { g: global, __dirname, m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)": (function(__turbopack_context__) {

var { g: global, __dirname, m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)": (function(__turbopack_context__) {

var { g: global, __dirname, m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)": (function(__turbopack_context__) {

var { g: global, __dirname, m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}}),
"[project]/packages/gensx-client/dist/sdk.js [app-route] (ecmascript)": (function(__turbopack_context__) {

var { g: global, __dirname, m: module, e: exports } = __turbopack_context__;
{
"use strict";
/**
 * GenSX SDK - Core SDK class for interacting with GenSX workflows
 */ Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.GenSX = void 0;
/**
 * GenSX SDK for interacting with GenSX workflows
 *
 * Usage:
 * ```typescript
 * const gensx = new GenSX({
 *   apiKey: 'your-api-key',
 *   org: 'your-org',
 *   project: 'your-project',
 *   environment: 'production'
 * });
 *
 * // Run a workflow with just inputs
 * const { output } = await gensx.run<string>('workflowName', {
 *   inputs: { userMessage: 'Hello world' }
 * });
 *
 * // Or override org/project for a specific call
 * const { output } = await gensx.run<string>('workflowName', {
 *   inputs: { userMessage: 'Hello world' },
 *   org: 'different-org',
 *   project: 'different-project'
 * });
 * ```
 */ class GenSX {
    apiKey;
    baseUrl;
    org;
    project;
    environment;
    isLocal;
    constructor(config){
        this.baseUrl = config.baseUrl ?? "https://api.gensx.com";
        this.isLocal = this.baseUrl.includes("localhost") && !config.overrideLocalMode;
        if (!this.isLocal) {
            // For non-local mode, require apiKey
            this.apiKey = this.getApiKey(config.apiKey);
            if (!this.apiKey) {
                throw new Error("apiKey is required. Provide it in the constructor or set the GENSX_API_KEY environment variable.");
            }
            // For non-local mode, require org/project/environment
            if (!config.org || !config.project || !config.environment) {
                throw new Error("org, project, and environment are required when calling deployed workflows. Provide them in the constructor or method options.");
            }
        }
        this.org = config.org;
        this.project = config.project;
        this.environment = config.environment;
    }
    /**
     * Run a workflow with optional streaming
     * @returns Either { output, progressStream } or { outputStream, progressStream } based on stream flag
     */ async run(workflowName, options = {}) {
        const { inputs = {}, stream = false } = options;
        // Use provided values or fall back to client defaults
        const org = options.org ?? this.org;
        const project = options.project ?? this.project;
        const environment = options.environment ?? this.environment;
        const response = await this.runRaw(workflowName, {
            inputs,
            org,
            project,
            environment
        });
        if (!response.body) {
            throw new Error("Response body is null");
        }
        if (stream) {
            // For streaming mode, split and return both streams
            const { outputStream, progressStream } = this.splitStreams(response);
            // Convert ReadableStream to AsyncIterable
            const outputIterable = this.createAsyncIterable(outputStream);
            return {
                outputStream: outputIterable,
                progressStream
            };
        } else {
            // Parse all events
            const events = [];
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            try {
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                while(true){
                    const { done, value } = await reader.read();
                    if (done) break;
                    buffer += decoder.decode(value, {
                        stream: true
                    });
                    const lines = buffer.split("\n");
                    buffer = lines.pop() ?? "";
                    for (const line of lines){
                        if (!line.trim()) continue;
                        try {
                            events.push(JSON.parse(line));
                        } catch  {
                            console.warn("Failed to parse event:", line);
                        }
                    }
                }
            } finally{
                reader.releaseLock();
            }
            // Process any output event to get the final result
            let output;
            // Aggregate output from output events
            const outputContents = events.filter((e)=>e.type === "output").map((e)=>e.content);
            if (outputContents.length === 0) {
                output = null;
            } else if (typeof outputContents[0] === "string") {
                output = outputContents.join("");
            } else {
                output = outputContents;
            }
            // Create progress stream from events
            const progressStream = new ReadableStream({
                start (controller) {
                    events.forEach((event)=>{
                        if (event.type !== "output") {
                            controller.enqueue(event);
                        }
                    });
                    controller.close();
                }
            });
            return {
                output,
                progressStream
            };
        }
    }
    /**
     * Run a workflow and return the raw Response object
     * Provides direct access to the fetch response without any processing
     *
     * @param workflowName - Name of the workflow to run
     * @param options - Options including format: 'sse' | 'ndjson' | 'json'
     * @returns Raw Response object
     */ async runRaw(workflowName, options = {}) {
        const { inputs = {}, format = "ndjson" } = options;
        // Use provided values or fall back to client defaults
        const org = options.org ?? this.org;
        const project = options.project ?? this.project;
        const environment = options.environment ?? this.environment;
        const url = this.buildWorkflowUrl(workflowName, org, project, environment);
        // Set Accept header based on format
        const acceptHeader = {
            sse: "text/event-stream",
            ndjson: "application/x-ndjson",
            json: "application/json"
        }[format];
        const response = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${this.apiKey}`,
                "Content-Type": "application/json",
                Accept: acceptHeader
            },
            body: JSON.stringify(inputs)
        });
        if (!response.ok) {
            throw new Error(`Failed to run workflow: ${response.status} ${response.statusText}`);
        }
        return response;
    }
    /**
     * Start a workflow asynchronously
     */ async start(workflowName, options = {}) {
        const { inputs = {} } = options;
        // Use provided values or fall back to client defaults
        const org = options.org ?? this.org;
        const project = options.project ?? this.project;
        const environment = options.environment ?? this.environment;
        const url = this.buildStartUrl(workflowName, org, project, environment);
        const response = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${this.apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(inputs)
        });
        if (!response.ok) {
            throw new Error(`Failed to start workflow: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        const executionId = response.headers.get("X-Execution-Id") ?? data.executionId;
        return {
            executionId,
            executionStatus: data.executionStatus ?? data.status ?? "started",
            data
        };
    }
    /**
     * Get progress updates for a workflow execution
     */ async getProgress(options) {
        const { executionId, format = "ndjson" } = options;
        const url = this.isLocal ? `${this.baseUrl}/workflowExecutions/${executionId}/progress` : `${this.baseUrl}/org/${this.org}/workflowExecutions/${executionId}/progress`;
        const accept = format === "sse" ? "text/event-stream" : "application/x-ndjson";
        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${this.apiKey}`,
                Accept: accept
            }
        });
        if (!response.ok) {
            throw new Error(`Failed to get progress: ${response.status} ${response.statusText}`);
        }
        if (!response.body) {
            throw new Error("Response body is null");
        }
        return response.body;
    }
    // Private helper methods
    buildWorkflowUrl(workflowName, org, project, environment) {
        // If baseUrl is localhost, use simplified path structure
        if (this.isLocal) {
            return `${this.baseUrl}/workflows/${workflowName}`;
        }
        // For non-local mode, require all parameters
        if (!org || !project || !environment) {
            throw new Error("org, project, and environment are required when calling deployed workflows");
        }
        const path = `/org/${org}/projects/${project}/environments/${environment}/workflows/${workflowName}`;
        return `${this.baseUrl}${path}`;
    }
    buildStartUrl(workflowName, org, project, environment) {
        return `${this.buildWorkflowUrl(workflowName, org, project, environment)}/start`;
    }
    /**
     * Process NDJSON stream and split into output and progress streams
     */ async *processStream(response) {
        const reader = response.body?.getReader();
        if (!reader) return;
        const decoder = new TextDecoder();
        let buffer = "";
        try {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            while(true){
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, {
                    stream: true
                });
                const lines = buffer.split("\n");
                buffer = lines.pop() ?? "";
                for (const line of lines){
                    if (!line.trim()) continue;
                    try {
                        const event = JSON.parse(line);
                        if (event.type === "output") {
                            yield {
                                output: event.content
                            };
                        } else {
                            yield {
                                progress: event
                            };
                        }
                    } catch (e) {
                        console.warn("Failed to parse NDJSON line:", e);
                    }
                }
            }
        } finally{
            reader.releaseLock();
        }
    }
    /**
     * Create separate streams for output and progress events
     */ splitStreams(response) {
        const processedStream = this.processStream(response);
        // Create transform streams to split the events
        const outputTransform = new TransformStream({
            transform (chunk, controller) {
                if (chunk.output !== undefined) {
                    controller.enqueue(chunk.output);
                }
            }
        });
        const progressTransform = new TransformStream({
            transform (chunk, controller) {
                if (chunk.progress !== undefined) {
                    controller.enqueue(chunk.progress);
                }
            }
        });
        // Create readable stream from async generator
        const sourceStream = new ReadableStream({
            async start (controller) {
                try {
                    for await (const item of processedStream){
                        controller.enqueue(item);
                    }
                    controller.close();
                } catch (error) {
                    controller.error(error);
                }
            }
        });
        // Pipe through transforms
        const [stream1, stream2] = sourceStream.tee();
        const outputStream = stream1.pipeThrough(outputTransform);
        const progressStream = stream2.pipeThrough(progressTransform);
        return {
            outputStream,
            progressStream
        };
    }
    /**
     * Create an async iterable from output stream
     */ async *createAsyncIterable(stream) {
        const reader = stream.getReader();
        try {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            while(true){
                const { done, value } = await reader.read();
                if (done) break;
                yield value;
            }
        } finally{
            reader.releaseLock();
        }
    }
    /**
     * Helper function to get API key from constructor or environment
     */ getApiKey(providedKey) {
        if (providedKey) {
            return providedKey;
        }
        try {
            return typeof process !== "undefined" ? process.env.GENSX_API_KEY : undefined;
        } catch  {
            return undefined;
        }
    }
}
exports.GenSX = GenSX; //# sourceMappingURL=sdk.js.map
}}),
"[project]/packages/gensx-client/dist/index.js [app-route] (ecmascript)": (function(__turbopack_context__) {

var { g: global, __dirname, m: module, e: exports } = __turbopack_context__;
{
"use strict";
/**
 * GenSX SDK - TypeScript SDK for GenSX workflow interactions
 *
 * This SDK provides a clean interface for interacting with GenSX workflows,
 * including both streaming and async execution patterns.
 */ Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = exports.GenSX = void 0;
// Main SDK export
var sdk_1 = __turbopack_context__.r("[project]/packages/gensx-client/dist/sdk.js [app-route] (ecmascript)");
Object.defineProperty(exports, "GenSX", {
    enumerable: true,
    get: function() {
        return sdk_1.GenSX;
    }
});
// Default export
var sdk_2 = __turbopack_context__.r("[project]/packages/gensx-client/dist/sdk.js [app-route] (ecmascript)");
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: function() {
        return sdk_2.GenSX;
    }
}); //# sourceMappingURL=index.js.map
}}),
"[project]/examples/draft-pad/app/api/gensx/route.ts [app-route] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.s({
    "GET": (()=>GET),
    "POST": (()=>POST)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$gensx$2d$client$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/gensx-client/dist/index.js [app-route] (ecmascript)");
;
const shouldUseLocalDevServer = ()=>{
    if (process.env.GENSX_BASE_URL && !process.env.GENSX_BASE_URL.includes("localhost")) {
        return false;
    }
    if (("TURBOPACK compile-time value", "development") === "production" || process.env.VERCEL_ENV) {
        return false;
    }
    return true;
};
async function POST(request) {
    try {
        const body = await request.json();
        const { workflowName, org, project, environment, format, ...inputs } = body;
        const useLocalDevServer = shouldUseLocalDevServer();
        // Validate required fields
        if (!workflowName) {
            return new Response(JSON.stringify({
                type: "error",
                error: "workflowName is required"
            }) + "\n", {
                status: 400,
                headers: {
                    "Content-Type": "application/x-ndjson"
                }
            });
        }
        // Get API key from environment (or could accept from Authorization header)
        let gensx;
        if (!useLocalDevServer) {
            const apiKey = process.env.GENSX_API_KEY ?? request.headers.get("Authorization")?.replace("Bearer ", "");
            if (!apiKey) {
                return new Response(JSON.stringify({
                    type: "error",
                    error: "API key not configured"
                }) + "\n", {
                    status: 401,
                    headers: {
                        "Content-Type": "application/x-ndjson"
                    }
                });
            }
            // Use defaults from environment if not provided in request
            const finalOrg = org ?? process.env.GENSX_ORG;
            const finalProject = project ?? process.env.GENSX_PROJECT;
            const finalEnvironment = environment ?? process.env.GENSX_ENVIRONMENT;
            if (!finalOrg || !finalProject || !finalEnvironment) {
                return new Response(JSON.stringify({
                    type: "error",
                    error: "org, project, and environment are required (either in request or environment)"
                }) + "\n", {
                    status: 400,
                    headers: {
                        "Content-Type": "application/x-ndjson"
                    }
                });
            }
            // Initialize GenSX SDK
            const baseUrl = process.env.GENSX_BASE_URL ?? "https://api.gensx.com";
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
            gensx = new __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$gensx$2d$client$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["GenSX"]({
                apiKey,
                baseUrl,
                org: finalOrg,
                project: finalProject,
                environment: finalEnvironment
            });
        } else {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
            gensx = new __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$gensx$2d$client$2f$dist$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["GenSX"]({
                baseUrl: process.env.GENSX_BASE_URL ?? "http://localhost:1337"
            });
        }
        // Use runRaw to get the direct response
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        const response = await gensx.runRaw(workflowName, {
            inputs,
            format: format ?? "ndjson"
        });
        // Determine content type based on format
        const responseFormat = format ?? "ndjson";
        const contentType = {
            sse: "text/event-stream",
            ndjson: "application/x-ndjson",
            json: "application/json"
        }[responseFormat];
        // Return the response directly to the client
        // This preserves the response format
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
        return new Response(response.body, {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            status: response.status,
            headers: {
                "Content-Type": contentType,
                "Cache-Control": "no-cache",
                Connection: "keep-alive"
            }
        });
    } catch (error) {
        console.error("GenSX proxy error:", error);
        // Return error as a GenSX error event
        const errorEvent = {
            type: "error",
            error: error instanceof Error ? error.message : "Internal server error"
        };
        return new Response(JSON.stringify(errorEvent) + "\n", {
            status: 500,
            headers: {
                "Content-Type": "application/x-ndjson"
            }
        });
    }
}
function GET() {
    return new Response(JSON.stringify({
        message: "GenSX Passthrough API",
        description: "This endpoint accepts the same parameters as the GenSX SDK and passes them through",
        usage: {
            method: "POST",
            body: {
                workflowName: "Name of the GenSX workflow to run (required)",
                org: "Organization name (optional if set in environment)",
                project: "Project name (optional if set in environment)",
                environment: "Environment name (optional)",
                format: 'Response format: "sse" | "ndjson" | "json" (optional, defaults to "ndjson")',
                "...inputs": "Any other fields are passed as workflow inputs"
            },
            example: {
                workflowName: "ChatWorkflow",
                org: "my-org",
                project: "my-project",
                environment: "production",
                format: "ndjson",
                userMessage: "Hello, how can you help me?"
            }
        },
        authentication: {
            option1: "Set GENSX_API_KEY environment variable",
            option2: "Pass Authorization header with Bearer token"
        },
        defaults: {
            GENSX_ORG: "Default organization if not provided in request",
            GENSX_PROJECT: "Default project if not provided in request",
            GENSX_ENVIRONMENT: "Default environment if not provided in request",
            GENSX_BASE_URL: "GenSX base URL (defaults to https://api.gensx.com)"
        }
    }, null, 2), {
        status: 200,
        headers: {
            "Content-Type": "application/json"
        }
    });
}
}}),

};

//# sourceMappingURL=%5Broot-of-the-server%5D__48e239b7._.js.map