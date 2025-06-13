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
"[project]/examples/draft-pad/app/api/gensx/route.ts [app-route] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.s({
    "GET": (()=>GET),
    "POST": (()=>POST)
});
(()=>{
    const e = new Error("Cannot find module '@gensx/client'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
;
async function POST(request) {
    try {
        const body = await request.json();
        const { workflowName, org, project, environment, format, ...inputs } = body;
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
        const apiKey = process.env.GENSX_API_KEY || request.headers.get("Authorization")?.replace("Bearer ", "");
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
        if (!finalOrg || !finalProject) {
            return new Response(JSON.stringify({
                type: "error",
                error: "org and project are required (either in request or environment)"
            }) + "\n", {
                status: 400,
                headers: {
                    "Content-Type": "application/x-ndjson"
                }
            });
        }
        // Initialize GenSX SDK
        const baseUrl = process.env.GENSX_BASE_URL || "https://api.gensx.com";
        const gensx = new GenSX({
            apiKey,
            baseUrl
        });
        // Use runRaw to get the direct response
        const response = await gensx.runRaw(workflowName, {
            org: finalOrg,
            project: finalProject,
            environment: finalEnvironment,
            inputs,
            format: format || "ndjson"
        });
        // Determine content type based on format
        const responseFormat = format || "ndjson";
        const contentType = {
            sse: "text/event-stream",
            ndjson: "application/x-ndjson",
            json: "application/json"
        }[responseFormat];
        // Return the response directly to the client
        // This preserves the response format
        return new Response(response.body, {
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
async function GET() {
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

//# sourceMappingURL=%5Broot-of-the-server%5D__09a53a0c._.js.map