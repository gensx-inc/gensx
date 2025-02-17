(globalThis.TURBOPACK = globalThis.TURBOPACK || []).push(["static/chunks/486ae_react-dom_06de9a._.js", {

"[project]/node_modules/.pnpm/react-dom@18.3.1_react@18.3.1/node_modules/react-dom/index.js [client] (ecmascript)": (function(__turbopack_context__) {

var { r: __turbopack_require__, f: __turbopack_module_context__, i: __turbopack_import__, s: __turbopack_esm__, v: __turbopack_export_value__, n: __turbopack_export_namespace__, c: __turbopack_cache__, M: __turbopack_modules__, l: __turbopack_load__, j: __turbopack_dynamic__, P: __turbopack_resolve_absolute_path__, U: __turbopack_relative_url__, R: __turbopack_resolve_module_id_path__, b: __turbopack_worker_blob_url__, g: global, __dirname, m: module, e: exports, t: __turbopack_require_real__ } = __turbopack_context__;
{
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/next@15.1.6_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/next/dist/build/polyfills/process.js [client] (ecmascript)");
'use strict';
function checkDCE() {
    /* global __REACT_DEVTOOLS_GLOBAL_HOOK__ */ if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ === 'undefined' || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE !== 'function') {
        return;
    }
    if ("TURBOPACK compile-time truthy", 1) {
        // This branch is unreachable because this function is only called
        // in production, but the condition is true only in development.
        // Therefore if the branch is still here, dead code elimination wasn't
        // properly applied.
        // Don't change the message. React DevTools relies on it. Also make sure
        // this message doesn't occur elsewhere in this function, or it will cause
        // a false positive.
        throw new Error('^_^');
    }
    try {
        // Verify that the code above has been dead code eliminated (DCE'd).
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(checkDCE);
    } catch (err) {
        // DevTools shouldn't crash React, no matter what.
        // We should still report in case we break this code.
        console.error(err);
    }
}
if ("TURBOPACK compile-time falsy", 0) {
    "TURBOPACK unreachable";
} else {
    module.exports = __turbopack_require__("[project]/node_modules/.pnpm/react-dom@18.3.1_react@18.3.1/node_modules/react-dom/cjs/react-dom.development.js [client] (ecmascript)");
}
}}),
"[project]/node_modules/.pnpm/react-dom@18.3.1_react@18.3.1/node_modules/react-dom/client.js [client] (ecmascript)": (function(__turbopack_context__) {

var { r: __turbopack_require__, f: __turbopack_module_context__, i: __turbopack_import__, s: __turbopack_esm__, v: __turbopack_export_value__, n: __turbopack_export_namespace__, c: __turbopack_cache__, M: __turbopack_modules__, l: __turbopack_load__, j: __turbopack_dynamic__, P: __turbopack_resolve_absolute_path__, U: __turbopack_relative_url__, R: __turbopack_resolve_module_id_path__, b: __turbopack_worker_blob_url__, g: global, __dirname, m: module, e: exports, t: __turbopack_require_real__ } = __turbopack_context__;
{
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$1$2e$6_react$2d$dom$40$18$2e$3$2e$1_react$40$18$2e$3$2e$1_$5f$react$40$18$2e$3$2e$1$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$client$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/next@15.1.6_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/next/dist/build/polyfills/process.js [client] (ecmascript)");
'use strict';
var m = __turbopack_require__("[project]/node_modules/.pnpm/react-dom@18.3.1_react@18.3.1/node_modules/react-dom/index.js [client] (ecmascript)");
if ("TURBOPACK compile-time falsy", 0) {
    "TURBOPACK unreachable";
} else {
    var i = m.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
    exports.createRoot = function(c, o) {
        i.usingClientEntryPoint = true;
        try {
            return m.createRoot(c, o);
        } finally{
            i.usingClientEntryPoint = false;
        }
    };
    exports.hydrateRoot = function(c, h, o) {
        i.usingClientEntryPoint = true;
        try {
            return m.hydrateRoot(c, h, o);
        } finally{
            i.usingClientEntryPoint = false;
        }
    };
}
}}),
}]);

//# sourceMappingURL=486ae_react-dom_06de9a._.js.map