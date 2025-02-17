const CHUNK_PUBLIC_PATH = "server/pages/_app.js";
const runtime = require("../chunks/ssr/[turbopack]_runtime.js");
runtime.loadChunk("server/chunks/ssr/[root of the server]__9e9b85._.js");
module.exports = runtime.getOrInstantiateRuntimeModule("[project]/node_modules/.pnpm/next@15.1.6_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/next/app.js [ssr] (ecmascript)", CHUNK_PUBLIC_PATH).exports;
