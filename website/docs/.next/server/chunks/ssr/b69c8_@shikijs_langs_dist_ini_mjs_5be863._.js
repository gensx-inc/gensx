module.exports = {

"[project]/node_modules/.pnpm/@shikijs+langs@2.4.2/node_modules/@shikijs/langs/dist/ini.mjs [app-rsc] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { r: __turbopack_require__, f: __turbopack_module_context__, i: __turbopack_import__, s: __turbopack_esm__, v: __turbopack_export_value__, n: __turbopack_export_namespace__, c: __turbopack_cache__, M: __turbopack_modules__, l: __turbopack_load__, j: __turbopack_dynamic__, P: __turbopack_resolve_absolute_path__, U: __turbopack_relative_url__, R: __turbopack_resolve_module_id_path__, b: __turbopack_worker_blob_url__, g: global, __dirname, x: __turbopack_external_require__, y: __turbopack_external_import__, z: __turbopack_require_stub__ } = __turbopack_context__;
{
__turbopack_esm__({
    "default": (()=>__TURBOPACK__default__export__)
});
const lang = Object.freeze(JSON.parse("{\"displayName\":\"INI\",\"name\":\"ini\",\"patterns\":[{\"begin\":\"(^[ \\\\t]+)?(?=#)\",\"beginCaptures\":{\"1\":{\"name\":\"punctuation.whitespace.comment.leading.ini\"}},\"end\":\"(?!\\\\G)\",\"patterns\":[{\"begin\":\"#\",\"beginCaptures\":{\"0\":{\"name\":\"punctuation.definition.comment.ini\"}},\"end\":\"\\\\n\",\"name\":\"comment.line.number-sign.ini\"}]},{\"begin\":\"(^[ \\\\t]+)?(?=;)\",\"beginCaptures\":{\"1\":{\"name\":\"punctuation.whitespace.comment.leading.ini\"}},\"end\":\"(?!\\\\G)\",\"patterns\":[{\"begin\":\";\",\"beginCaptures\":{\"0\":{\"name\":\"punctuation.definition.comment.ini\"}},\"end\":\"\\\\n\",\"name\":\"comment.line.semicolon.ini\"}]},{\"captures\":{\"1\":{\"name\":\"keyword.other.definition.ini\"},\"2\":{\"name\":\"punctuation.separator.key-value.ini\"}},\"match\":\"\\\\b([a-zA-Z0-9_.-]+)\\\\b\\\\s*(=)\"},{\"captures\":{\"1\":{\"name\":\"punctuation.definition.entity.ini\"},\"3\":{\"name\":\"punctuation.definition.entity.ini\"}},\"match\":\"^(\\\\[)(.*?)(\\\\])\",\"name\":\"entity.name.section.group-title.ini\"},{\"begin\":\"'\",\"beginCaptures\":{\"0\":{\"name\":\"punctuation.definition.string.begin.ini\"}},\"end\":\"'\",\"endCaptures\":{\"0\":{\"name\":\"punctuation.definition.string.end.ini\"}},\"name\":\"string.quoted.single.ini\",\"patterns\":[{\"match\":\"\\\\\\\\.\",\"name\":\"constant.character.escape.ini\"}]},{\"begin\":\"\\\"\",\"beginCaptures\":{\"0\":{\"name\":\"punctuation.definition.string.begin.ini\"}},\"end\":\"\\\"\",\"endCaptures\":{\"0\":{\"name\":\"punctuation.definition.string.end.ini\"}},\"name\":\"string.quoted.double.ini\"}],\"scopeName\":\"source.ini\",\"aliases\":[\"properties\"]}"));
const __TURBOPACK__default__export__ = [
    lang
];
}}),

};

//# sourceMappingURL=b69c8_%40shikijs_langs_dist_ini_mjs_5be863._.js.map