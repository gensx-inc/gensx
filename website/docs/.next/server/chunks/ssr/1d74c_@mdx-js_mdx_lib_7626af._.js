module.exports = {

"[project]/node_modules/.pnpm/@mdx-js+mdx@3.1.0_acorn@8.14.0/node_modules/@mdx-js/mdx/lib/plugin/remark-mark-and-unravel.js [app-rsc] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { r: __turbopack_require__, f: __turbopack_module_context__, i: __turbopack_import__, s: __turbopack_esm__, v: __turbopack_export_value__, n: __turbopack_export_namespace__, c: __turbopack_cache__, M: __turbopack_modules__, l: __turbopack_load__, j: __turbopack_dynamic__, P: __turbopack_resolve_absolute_path__, U: __turbopack_relative_url__, R: __turbopack_resolve_module_id_path__, b: __turbopack_worker_blob_url__, g: global, __dirname, x: __turbopack_external_require__, y: __turbopack_external_import__, z: __turbopack_require_stub__ } = __turbopack_context__;
{
/**
 * @import {Root, RootContent} from 'mdast'
 */ __turbopack_esm__({
    "remarkMarkAndUnravel": (()=>remarkMarkAndUnravel)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$estree$2d$walker$40$3$2e$0$2e$3$2f$node_modules$2f$estree$2d$walker$2f$src$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/estree-walker@3.0.3/node_modules/estree-walker/src/index.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$unist$2d$util$2d$visit$40$5$2e$0$2e$0$2f$node_modules$2f$unist$2d$util$2d$visit$2f$lib$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_import__("[project]/node_modules/.pnpm/unist-util-visit@5.0.0/node_modules/unist-util-visit/lib/index.js [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$collapse$2d$white$2d$space$40$2$2e$1$2e$0$2f$node_modules$2f$collapse$2d$white$2d$space$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/collapse-white-space@2.1.0/node_modules/collapse-white-space/index.js [app-rsc] (ecmascript)");
;
;
;
function remarkMarkAndUnravel() {
    /**
   * @param {Root} tree
   *   Tree.
   * @returns {undefined}
   *   Nothing.
   */ return function(tree) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$unist$2d$util$2d$visit$40$5$2e$0$2e$0$2f$node_modules$2f$unist$2d$util$2d$visit$2f$lib$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["visit"])(tree, function(node, index, parent) {
            let offset = -1;
            let all = true;
            let oneOrMore = false;
            if (parent && typeof index === 'number' && node.type === 'paragraph') {
                const children = node.children;
                while(++offset < children.length){
                    const child = children[offset];
                    if (child.type === 'mdxJsxTextElement' || child.type === 'mdxTextExpression') {
                        oneOrMore = true;
                    } else if (child.type === 'text' && (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$collapse$2d$white$2d$space$40$2$2e$1$2e$0$2f$node_modules$2f$collapse$2d$white$2d$space$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["collapseWhiteSpace"])(child.value, {
                        style: 'html',
                        trim: true
                    }) === '') {
                    // Empty.
                    } else {
                        all = false;
                        break;
                    }
                }
                if (all && oneOrMore) {
                    offset = -1;
                    /** @type {Array<RootContent>} */ const newChildren = [];
                    while(++offset < children.length){
                        const child = children[offset];
                        if (child.type === 'mdxJsxTextElement') {
                            // @ts-expect-error: mutate because it is faster; content model is fine.
                            child.type = 'mdxJsxFlowElement';
                        }
                        if (child.type === 'mdxTextExpression') {
                            // @ts-expect-error: mutate because it is faster; content model is fine.
                            child.type = 'mdxFlowExpression';
                        }
                        if (child.type === 'text' && /^[\t\r\n ]+$/.test(String(child.value))) {
                        // Empty.
                        } else {
                            newChildren.push(child);
                        }
                    }
                    parent.children.splice(index, 1, ...newChildren);
                    return index;
                }
            }
            if (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') {
                const data = node.data || (node.data = {});
                data._mdxExplicitJsx = true;
            }
            if ((node.type === 'mdxFlowExpression' || node.type === 'mdxTextExpression' || node.type === 'mdxjsEsm') && node.data && node.data.estree) {
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$estree$2d$walker$40$3$2e$0$2e$3$2f$node_modules$2f$estree$2d$walker$2f$src$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["walk"])(node.data.estree, {
                    enter (node) {
                        if (node.type === 'JSXElement') {
                            const data = node.data || (node.data = {});
                            data._mdxExplicitJsx = true;
                        }
                    }
                });
            }
        });
    };
}
}}),
"[project]/node_modules/.pnpm/@mdx-js+mdx@3.1.0_acorn@8.14.0/node_modules/@mdx-js/mdx/lib/node-types.js [app-rsc] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { r: __turbopack_require__, f: __turbopack_module_context__, i: __turbopack_import__, s: __turbopack_esm__, v: __turbopack_export_value__, n: __turbopack_export_namespace__, c: __turbopack_cache__, M: __turbopack_modules__, l: __turbopack_load__, j: __turbopack_dynamic__, P: __turbopack_resolve_absolute_path__, U: __turbopack_relative_url__, R: __turbopack_resolve_module_id_path__, b: __turbopack_worker_blob_url__, g: global, __dirname, x: __turbopack_external_require__, y: __turbopack_external_import__, z: __turbopack_require_stub__ } = __turbopack_context__;
{
/**
 * List of node types made by `mdast-util-mdx`, which have to be passed
 * through untouched from the mdast tree to the hast tree.
 */ __turbopack_esm__({
    "nodeTypes": (()=>nodeTypes)
});
const nodeTypes = [
    'mdxFlowExpression',
    'mdxJsxFlowElement',
    'mdxJsxTextElement',
    'mdxTextExpression',
    'mdxjsEsm'
];
}}),
"[project]/node_modules/.pnpm/@mdx-js+mdx@3.1.0_acorn@8.14.0/node_modules/@mdx-js/mdx/lib/plugin/rehype-remove-raw.js [app-rsc] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { r: __turbopack_require__, f: __turbopack_module_context__, i: __turbopack_import__, s: __turbopack_esm__, v: __turbopack_export_value__, n: __turbopack_export_namespace__, c: __turbopack_cache__, M: __turbopack_modules__, l: __turbopack_load__, j: __turbopack_dynamic__, P: __turbopack_resolve_absolute_path__, U: __turbopack_relative_url__, R: __turbopack_resolve_module_id_path__, b: __turbopack_worker_blob_url__, g: global, __dirname, x: __turbopack_external_require__, y: __turbopack_external_import__, z: __turbopack_require_stub__ } = __turbopack_context__;
{
/**
 * @import {Root} from 'hast'
 */ __turbopack_esm__({
    "rehypeRemoveRaw": (()=>rehypeRemoveRaw)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$unist$2d$util$2d$visit$40$5$2e$0$2e$0$2f$node_modules$2f$unist$2d$util$2d$visit$2f$lib$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_import__("[project]/node_modules/.pnpm/unist-util-visit@5.0.0/node_modules/unist-util-visit/lib/index.js [app-rsc] (ecmascript) <locals>");
;
function rehypeRemoveRaw() {
    /**
   * @param {Root} tree
   *   Tree.
   * @returns {undefined}
   *   Nothing.
   */ return function(tree) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$unist$2d$util$2d$visit$40$5$2e$0$2e$0$2f$node_modules$2f$unist$2d$util$2d$visit$2f$lib$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["visit"])(tree, 'raw', function(_, index, parent) {
            if (parent && typeof index === 'number') {
                parent.children.splice(index, 1);
                return index;
            }
        });
    };
}
}}),
"[project]/node_modules/.pnpm/@mdx-js+mdx@3.1.0_acorn@8.14.0/node_modules/@mdx-js/mdx/lib/util/estree-util-create.js [app-rsc] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { r: __turbopack_require__, f: __turbopack_module_context__, i: __turbopack_import__, s: __turbopack_esm__, v: __turbopack_export_value__, n: __turbopack_export_namespace__, c: __turbopack_cache__, M: __turbopack_modules__, l: __turbopack_load__, j: __turbopack_dynamic__, P: __turbopack_resolve_absolute_path__, U: __turbopack_relative_url__, R: __turbopack_resolve_module_id_path__, b: __turbopack_worker_blob_url__, g: global, __dirname, x: __turbopack_external_require__, y: __turbopack_external_import__, z: __turbopack_require_stub__ } = __turbopack_context__;
{
/**
 * @import {Node} from 'estree-jsx'
 */ // Fix to show references to above types in VS Code.
__turbopack_esm__({
    "create": (()=>create)
});
'';
function create(from, to) {
    /** @type {Array<keyof Node>} */ const fields = [
        'start',
        'end',
        'loc',
        'range'
    ];
    let index = -1;
    while(++index < fields.length){
        const field = fields[index];
        if (field in from) {
            // @ts-expect-error: assume they’re settable.
            to[field] = from[field];
        }
    }
}
}}),
"[project]/node_modules/.pnpm/@mdx-js+mdx@3.1.0_acorn@8.14.0/node_modules/@mdx-js/mdx/lib/util/estree-util-is-declaration.js [app-rsc] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { r: __turbopack_require__, f: __turbopack_module_context__, i: __turbopack_import__, s: __turbopack_esm__, v: __turbopack_export_value__, n: __turbopack_export_namespace__, c: __turbopack_cache__, M: __turbopack_modules__, l: __turbopack_load__, j: __turbopack_dynamic__, P: __turbopack_resolve_absolute_path__, U: __turbopack_relative_url__, R: __turbopack_resolve_module_id_path__, b: __turbopack_worker_blob_url__, g: global, __dirname, x: __turbopack_external_require__, y: __turbopack_external_import__, z: __turbopack_require_stub__ } = __turbopack_context__;
{
/**
 * @import {
      Declaration,
      MaybeNamedClassDeclaration,
      MaybeNamedFunctionDeclaration,
      Node
 * } from 'estree-jsx'
 */ // Fix to show references to above types in VS Code.
__turbopack_esm__({
    "isDeclaration": (()=>isDeclaration)
});
'';
function isDeclaration(node) {
    return Boolean(node.type === 'FunctionDeclaration' || node.type === 'ClassDeclaration' || node.type === 'VariableDeclaration');
}
}}),
"[project]/node_modules/.pnpm/@mdx-js+mdx@3.1.0_acorn@8.14.0/node_modules/@mdx-js/mdx/lib/util/estree-util-declaration-to-expression.js [app-rsc] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { r: __turbopack_require__, f: __turbopack_module_context__, i: __turbopack_import__, s: __turbopack_esm__, v: __turbopack_export_value__, n: __turbopack_export_namespace__, c: __turbopack_cache__, M: __turbopack_modules__, l: __turbopack_load__, j: __turbopack_dynamic__, P: __turbopack_resolve_absolute_path__, U: __turbopack_relative_url__, R: __turbopack_resolve_module_id_path__, b: __turbopack_worker_blob_url__, g: global, __dirname, x: __turbopack_external_require__, y: __turbopack_external_import__, z: __turbopack_require_stub__ } = __turbopack_context__;
{
/**
 * @import {
      Declaration,
      Expression,
      MaybeNamedClassDeclaration,
      MaybeNamedFunctionDeclaration
 * } from 'estree-jsx'
 */ __turbopack_esm__({
    "declarationToExpression": (()=>declarationToExpression)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$devlop$40$1$2e$1$2e$0$2f$node_modules$2f$devlop$2f$lib$2f$development$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/devlop@1.1.0/node_modules/devlop/lib/development.js [app-rsc] (ecmascript)");
;
function declarationToExpression(declaration) {
    if (declaration.type === 'FunctionDeclaration') {
        return {
            ...declaration,
            type: 'FunctionExpression'
        };
    }
    // This is currently an internal utility so the next shouldn’t happen or a
    // maintainer is making a mistake.
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$devlop$40$1$2e$1$2e$0$2f$node_modules$2f$devlop$2f$lib$2f$development$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ok"])(declaration.type === 'ClassDeclaration', 'unexpected node type');
    return {
        ...declaration,
        type: 'ClassExpression'
    };
}
}}),
"[project]/node_modules/.pnpm/@mdx-js+mdx@3.1.0_acorn@8.14.0/node_modules/@mdx-js/mdx/lib/util/estree-util-specifiers-to-declarations.js [app-rsc] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { r: __turbopack_require__, f: __turbopack_module_context__, i: __turbopack_import__, s: __turbopack_esm__, v: __turbopack_export_value__, n: __turbopack_export_namespace__, c: __turbopack_cache__, M: __turbopack_modules__, l: __turbopack_load__, j: __turbopack_dynamic__, P: __turbopack_resolve_absolute_path__, U: __turbopack_relative_url__, R: __turbopack_resolve_module_id_path__, b: __turbopack_worker_blob_url__, g: global, __dirname, x: __turbopack_external_require__, y: __turbopack_external_import__, z: __turbopack_require_stub__ } = __turbopack_context__;
{
/**
 * @import {
      AssignmentProperty,
      ExportSpecifier,
      Expression,
      Identifier,
      ImportDefaultSpecifier,
      ImportNamespaceSpecifier,
      ImportSpecifier,
      Literal,
      VariableDeclarator
 * } from 'estree-jsx'
 */ __turbopack_esm__({
    "specifiersToDeclarations": (()=>specifiersToDeclarations)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$mdx$2d$js$2b$mdx$40$3$2e$1$2e$0_acorn$40$8$2e$14$2e$0$2f$node_modules$2f40$mdx$2d$js$2f$mdx$2f$lib$2f$util$2f$estree$2d$util$2d$create$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/@mdx-js+mdx@3.1.0_acorn@8.14.0/node_modules/@mdx-js/mdx/lib/util/estree-util-create.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$devlop$40$1$2e$1$2e$0$2f$node_modules$2f$devlop$2f$lib$2f$development$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/devlop@1.1.0/node_modules/devlop/lib/development.js [app-rsc] (ecmascript)");
;
;
function specifiersToDeclarations(specifiers, init) {
    let index = -1;
    /** @type {Array<VariableDeclarator>} */ const declarations = [];
    /** @type {Array<ExportSpecifier | ImportDefaultSpecifier | ImportSpecifier>} */ const otherSpecifiers = [];
    // Can only be one according to JS syntax.
    /** @type {ImportNamespaceSpecifier | undefined} */ let importNamespaceSpecifier;
    while(++index < specifiers.length){
        const specifier = specifiers[index];
        if (specifier.type === 'ImportNamespaceSpecifier') {
            importNamespaceSpecifier = specifier;
        } else {
            otherSpecifiers.push(specifier);
        }
    }
    if (importNamespaceSpecifier) {
        /** @type {VariableDeclarator} */ const declarator = {
            type: 'VariableDeclarator',
            id: importNamespaceSpecifier.local,
            init
        };
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$mdx$2d$js$2b$mdx$40$3$2e$1$2e$0_acorn$40$8$2e$14$2e$0$2f$node_modules$2f40$mdx$2d$js$2f$mdx$2f$lib$2f$util$2f$estree$2d$util$2d$create$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["create"])(importNamespaceSpecifier, declarator);
        declarations.push(declarator);
    }
    declarations.push({
        type: 'VariableDeclarator',
        id: {
            type: 'ObjectPattern',
            properties: otherSpecifiers.map(function(specifier) {
                /** @type {Identifier | Literal} */ let key = specifier.type === 'ImportSpecifier' ? specifier.imported : specifier.type === 'ExportSpecifier' ? specifier.exported : {
                    type: 'Identifier',
                    name: 'default'
                };
                let value = specifier.local;
                // Switch them around if we’re exporting.
                if (specifier.type === 'ExportSpecifier') {
                    value = key;
                    key = specifier.local;
                }
                // To do: what to do about literals?
                // `const { a: 'b' } = c()` does not work?
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$devlop$40$1$2e$1$2e$0$2f$node_modules$2f$devlop$2f$lib$2f$development$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ok"])(value.type === 'Identifier');
                /** @type {AssignmentProperty} */ const property = {
                    type: 'Property',
                    kind: 'init',
                    shorthand: key.type === 'Identifier' && value.type === 'Identifier' && key.name === value.name,
                    method: false,
                    computed: false,
                    key,
                    value
                };
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$mdx$2d$js$2b$mdx$40$3$2e$1$2e$0_acorn$40$8$2e$14$2e$0$2f$node_modules$2f40$mdx$2d$js$2f$mdx$2f$lib$2f$util$2f$estree$2d$util$2d$create$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["create"])(specifier, property);
                return property;
            })
        },
        init: importNamespaceSpecifier ? {
            type: 'Identifier',
            name: importNamespaceSpecifier.local.name
        } : init
    });
    return declarations;
}
}}),
"[project]/node_modules/.pnpm/@mdx-js+mdx@3.1.0_acorn@8.14.0/node_modules/@mdx-js/mdx/lib/util/estree-util-to-id-or-member-expression.js [app-rsc] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { r: __turbopack_require__, f: __turbopack_module_context__, i: __turbopack_import__, s: __turbopack_esm__, v: __turbopack_export_value__, n: __turbopack_export_namespace__, c: __turbopack_cache__, M: __turbopack_modules__, l: __turbopack_load__, j: __turbopack_dynamic__, P: __turbopack_resolve_absolute_path__, U: __turbopack_relative_url__, R: __turbopack_resolve_module_id_path__, b: __turbopack_worker_blob_url__, g: global, __dirname, x: __turbopack_external_require__, y: __turbopack_external_import__, z: __turbopack_require_stub__ } = __turbopack_context__;
{
/**
 * @import {
      Identifier,
      JSXIdentifier,
      JSXMemberExpression,
      Literal,
      MemberExpression
 * } from 'estree-jsx'
 */ __turbopack_esm__({
    "toIdOrMemberExpression": (()=>toIdOrMemberExpression),
    "toJsxIdOrMemberExpression": (()=>toJsxIdOrMemberExpression)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$estree$2d$util$2d$is$2d$identifier$2d$name$40$3$2e$0$2e$0$2f$node_modules$2f$estree$2d$util$2d$is$2d$identifier$2d$name$2f$lib$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/estree-util-is-identifier-name@3.0.0/node_modules/estree-util-is-identifier-name/lib/index.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$devlop$40$1$2e$1$2e$0$2f$node_modules$2f$devlop$2f$lib$2f$development$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/devlop@1.1.0/node_modules/devlop/lib/development.js [app-rsc] (ecmascript)");
;
;
function toIdOrMemberExpression(ids) {
    let index = -1;
    /** @type {Identifier | Literal | MemberExpression | undefined} */ let object;
    while(++index < ids.length){
        const name = ids[index];
        /** @type {Identifier | Literal} */ const id = typeof name === 'string' && (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$estree$2d$util$2d$is$2d$identifier$2d$name$40$3$2e$0$2e$0$2f$node_modules$2f$estree$2d$util$2d$is$2d$identifier$2d$name$2f$lib$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["name"])(name) ? {
            type: 'Identifier',
            name
        } : {
            type: 'Literal',
            value: name
        };
        object = object ? {
            type: 'MemberExpression',
            object,
            property: id,
            computed: id.type === 'Literal',
            optional: false
        } : id;
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$devlop$40$1$2e$1$2e$0$2f$node_modules$2f$devlop$2f$lib$2f$development$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ok"])(object, 'expected non-empty `ids` to be passed');
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$devlop$40$1$2e$1$2e$0$2f$node_modules$2f$devlop$2f$lib$2f$development$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ok"])(object.type !== 'Literal', 'expected identifier as left-most value');
    return object;
}
function toJsxIdOrMemberExpression(ids) {
    let index = -1;
    /** @type {JSXIdentifier | JSXMemberExpression | undefined} */ let object;
    while(++index < ids.length){
        const name = ids[index];
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$devlop$40$1$2e$1$2e$0$2f$node_modules$2f$devlop$2f$lib$2f$development$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ok"])(typeof name === 'string' && (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$estree$2d$util$2d$is$2d$identifier$2d$name$40$3$2e$0$2e$0$2f$node_modules$2f$estree$2d$util$2d$is$2d$identifier$2d$name$2f$lib$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["name"])(name, {
            jsx: true
        }), 'expected valid jsx identifier, not `' + name + '`');
        /** @type {JSXIdentifier} */ const id = {
            type: 'JSXIdentifier',
            name
        };
        object = object ? {
            type: 'JSXMemberExpression',
            object,
            property: id
        } : id;
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$devlop$40$1$2e$1$2e$0$2f$node_modules$2f$devlop$2f$lib$2f$development$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ok"])(object, 'expected non-empty `ids` to be passed');
    return object;
}
}}),
"[project]/node_modules/.pnpm/@mdx-js+mdx@3.1.0_acorn@8.14.0/node_modules/@mdx-js/mdx/lib/plugin/recma-document.js [app-rsc] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { r: __turbopack_require__, f: __turbopack_module_context__, i: __turbopack_import__, s: __turbopack_esm__, v: __turbopack_export_value__, n: __turbopack_export_namespace__, c: __turbopack_cache__, M: __turbopack_modules__, l: __turbopack_load__, j: __turbopack_dynamic__, P: __turbopack_resolve_absolute_path__, U: __turbopack_relative_url__, R: __turbopack_resolve_module_id_path__, b: __turbopack_worker_blob_url__, g: global, __dirname, x: __turbopack_external_require__, y: __turbopack_external_import__, z: __turbopack_require_stub__ } = __turbopack_context__;
{
/**
 * @import {
      CallExpression,
      Directive,
      ExportAllDeclaration,
      ExportDefaultDeclaration,
      ExportNamedDeclaration,
      ExportSpecifier,
      Expression,
      FunctionDeclaration,
      Identifier,
      ImportDeclaration,
      ImportDefaultSpecifier,
      ImportExpression,
      ImportSpecifier,
      JSXElement,
      JSXFragment,
      Literal,
      ModuleDeclaration,
      Node,
      Program,
      Property,
      SimpleLiteral,
      SpreadElement,
      Statement,
      VariableDeclarator
 * } from 'estree-jsx'
 * @import {VFile} from 'vfile'
 * @import {ProcessorOptions} from '../core.js'
 */ __turbopack_esm__({
    "recmaDocument": (()=>recmaDocument)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$estree$2d$walker$40$3$2e$0$2e$3$2f$node_modules$2f$estree$2d$walker$2f$src$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/estree-walker@3.0.3/node_modules/estree-walker/src/index.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$unist$2d$util$2d$stringify$2d$position$40$4$2e$0$2e$0$2f$node_modules$2f$unist$2d$util$2d$stringify$2d$position$2f$lib$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/unist-util-stringify-position@4.0.0/node_modules/unist-util-stringify-position/lib/index.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$unist$2d$util$2d$position$2d$from$2d$estree$40$2$2e$0$2e$0$2f$node_modules$2f$unist$2d$util$2d$position$2d$from$2d$estree$2f$lib$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/unist-util-position-from-estree@2.0.0/node_modules/unist-util-position-from-estree/lib/index.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$mdx$2d$js$2b$mdx$40$3$2e$1$2e$0_acorn$40$8$2e$14$2e$0$2f$node_modules$2f40$mdx$2d$js$2f$mdx$2f$lib$2f$util$2f$estree$2d$util$2d$create$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/@mdx-js+mdx@3.1.0_acorn@8.14.0/node_modules/@mdx-js/mdx/lib/util/estree-util-create.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$mdx$2d$js$2b$mdx$40$3$2e$1$2e$0_acorn$40$8$2e$14$2e$0$2f$node_modules$2f40$mdx$2d$js$2f$mdx$2f$lib$2f$util$2f$estree$2d$util$2d$is$2d$declaration$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/@mdx-js+mdx@3.1.0_acorn@8.14.0/node_modules/@mdx-js/mdx/lib/util/estree-util-is-declaration.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$mdx$2d$js$2b$mdx$40$3$2e$1$2e$0_acorn$40$8$2e$14$2e$0$2f$node_modules$2f40$mdx$2d$js$2f$mdx$2f$lib$2f$util$2f$estree$2d$util$2d$declaration$2d$to$2d$expression$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/@mdx-js+mdx@3.1.0_acorn@8.14.0/node_modules/@mdx-js/mdx/lib/util/estree-util-declaration-to-expression.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$devlop$40$1$2e$1$2e$0$2f$node_modules$2f$devlop$2f$lib$2f$development$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/devlop@1.1.0/node_modules/devlop/lib/development.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$estree$2d$util$2d$scope$40$1$2e$0$2e$0$2f$node_modules$2f$estree$2d$util$2d$scope$2f$lib$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/estree-util-scope@1.0.0/node_modules/estree-util-scope/lib/index.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$mdx$2d$js$2b$mdx$40$3$2e$1$2e$0_acorn$40$8$2e$14$2e$0$2f$node_modules$2f40$mdx$2d$js$2f$mdx$2f$lib$2f$util$2f$estree$2d$util$2d$specifiers$2d$to$2d$declarations$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/@mdx-js+mdx@3.1.0_acorn@8.14.0/node_modules/@mdx-js/mdx/lib/util/estree-util-specifiers-to-declarations.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$mdx$2d$js$2b$mdx$40$3$2e$1$2e$0_acorn$40$8$2e$14$2e$0$2f$node_modules$2f40$mdx$2d$js$2f$mdx$2f$lib$2f$util$2f$estree$2d$util$2d$to$2d$id$2d$or$2d$member$2d$expression$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/@mdx-js+mdx@3.1.0_acorn@8.14.0/node_modules/@mdx-js/mdx/lib/util/estree-util-to-id-or-member-expression.js [app-rsc] (ecmascript)");
;
;
;
;
;
;
;
;
;
;
function recmaDocument(options) {
    const baseUrl = options.baseUrl || undefined;
    const baseHref = typeof baseUrl === 'object' ? baseUrl.href : baseUrl;
    const outputFormat = options.outputFormat || 'program';
    const pragma = options.pragma === undefined ? 'React.createElement' : options.pragma;
    const pragmaFrag = options.pragmaFrag === undefined ? 'React.Fragment' : options.pragmaFrag;
    const pragmaImportSource = options.pragmaImportSource || 'react';
    const jsxImportSource = options.jsxImportSource || 'react';
    const jsxRuntime = options.jsxRuntime || 'automatic';
    /**
   * @param {Program} tree
   *   Tree.
   * @param {VFile} file
   *   File.
   * @returns {undefined}
   *   Nothing.
   */ return function(tree, file) {
        /** @type {Array<[string, string] | string>} */ const exportedValues = [];
        /** @type {Array<Directive | ModuleDeclaration | Statement>} */ const replacement = [];
        let exportAllCount = 0;
        /** @type {ExportDefaultDeclaration | ExportSpecifier | undefined} */ let layout;
        /** @type {boolean | undefined} */ let content;
        /** @type {Node} */ let child;
        if (jsxRuntime === 'classic' && pragmaFrag) {
            injectPragma(tree, '@jsxFrag', pragmaFrag);
        }
        if (jsxRuntime === 'classic' && pragma) {
            injectPragma(tree, '@jsx', pragma);
        }
        if (jsxRuntime === 'automatic' && jsxImportSource) {
            injectPragma(tree, '@jsxImportSource', jsxImportSource);
        }
        if ("TURBOPACK compile-time truthy", 1) {
            injectPragma(tree, '@jsxRuntime', jsxRuntime);
        }
        if (jsxRuntime === 'classic' && pragmaImportSource) {
            if (!pragma) {
                throw new Error('Missing `pragma` in classic runtime with `pragmaImportSource`');
            }
            handleEsm({
                type: 'ImportDeclaration',
                specifiers: [
                    {
                        type: 'ImportDefaultSpecifier',
                        local: {
                            type: 'Identifier',
                            name: pragma.split('.')[0]
                        }
                    }
                ],
                source: {
                    type: 'Literal',
                    value: pragmaImportSource
                }
            });
        }
        // Find the `export default`, the JSX expression, and leave the rest
        // (import/exports) as they are.
        for (child of tree.body){
            // ```tsx
            // export default properties => <>{properties.children}</>
            // ```
            //
            // Treat it as an inline layout declaration.
            if (child.type === 'ExportDefaultDeclaration') {
                if (layout) {
                    file.fail('Unexpected duplicate layout, expected a single layout (previous: ' + (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$unist$2d$util$2d$stringify$2d$position$40$4$2e$0$2e$0$2f$node_modules$2f$unist$2d$util$2d$stringify$2d$position$2f$lib$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["stringifyPosition"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$unist$2d$util$2d$position$2d$from$2d$estree$40$2$2e$0$2e$0$2f$node_modules$2f$unist$2d$util$2d$position$2d$from$2d$estree$2f$lib$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["positionFromEstree"])(layout)) + ')', {
                        ancestors: [
                            tree,
                            child
                        ],
                        place: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$unist$2d$util$2d$position$2d$from$2d$estree$40$2$2e$0$2e$0$2f$node_modules$2f$unist$2d$util$2d$position$2d$from$2d$estree$2f$lib$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["positionFromEstree"])(child),
                        ruleId: 'duplicate-layout',
                        source: 'recma-document'
                    });
                }
                layout = child;
                replacement.push({
                    type: 'VariableDeclaration',
                    kind: 'const',
                    declarations: [
                        {
                            type: 'VariableDeclarator',
                            id: {
                                type: 'Identifier',
                                name: 'MDXLayout'
                            },
                            init: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$mdx$2d$js$2b$mdx$40$3$2e$1$2e$0_acorn$40$8$2e$14$2e$0$2f$node_modules$2f40$mdx$2d$js$2f$mdx$2f$lib$2f$util$2f$estree$2d$util$2d$is$2d$declaration$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["isDeclaration"])(child.declaration) ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$mdx$2d$js$2b$mdx$40$3$2e$1$2e$0_acorn$40$8$2e$14$2e$0$2f$node_modules$2f40$mdx$2d$js$2f$mdx$2f$lib$2f$util$2f$estree$2d$util$2d$declaration$2d$to$2d$expression$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["declarationToExpression"])(child.declaration) : child.declaration
                        }
                    ]
                });
            } else if (child.type === 'ExportNamedDeclaration' && child.source) {
                // Cast because always simple.
                const source = child.source;
                // Remove `default` or `as default`, but not `default as`, specifier.
                child.specifiers = child.specifiers.filter(function(specifier) {
                    if (specifier.exported.type === 'Identifier' && specifier.exported.name === 'default') {
                        if (layout) {
                            file.fail('Unexpected duplicate layout, expected a single layout (previous: ' + (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$unist$2d$util$2d$stringify$2d$position$40$4$2e$0$2e$0$2f$node_modules$2f$unist$2d$util$2d$stringify$2d$position$2f$lib$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["stringifyPosition"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$unist$2d$util$2d$position$2d$from$2d$estree$40$2$2e$0$2e$0$2f$node_modules$2f$unist$2d$util$2d$position$2d$from$2d$estree$2f$lib$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["positionFromEstree"])(layout)) + ')', {
                                ancestors: [
                                    tree,
                                    child,
                                    specifier
                                ],
                                place: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$unist$2d$util$2d$position$2d$from$2d$estree$40$2$2e$0$2e$0$2f$node_modules$2f$unist$2d$util$2d$position$2d$from$2d$estree$2f$lib$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["positionFromEstree"])(child),
                                ruleId: 'duplicate-layout',
                                source: 'recma-document'
                            });
                        }
                        layout = specifier;
                        // Make it just an import: `import MDXLayout from '…'`.
                        /** @type {Array<ImportDefaultSpecifier | ImportSpecifier>} */ const specifiers = [];
                        // Default as default / something else as default.
                        if (specifier.local.type === 'Identifier' && specifier.local.name === 'default') {
                            specifiers.push({
                                type: 'ImportDefaultSpecifier',
                                local: {
                                    type: 'Identifier',
                                    name: 'MDXLayout'
                                }
                            });
                        } else {
                            /** @type {ImportSpecifier} */ const importSpecifier = {
                                type: 'ImportSpecifier',
                                imported: specifier.local,
                                local: {
                                    type: 'Identifier',
                                    name: 'MDXLayout'
                                }
                            };
                            (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$mdx$2d$js$2b$mdx$40$3$2e$1$2e$0_acorn$40$8$2e$14$2e$0$2f$node_modules$2f40$mdx$2d$js$2f$mdx$2f$lib$2f$util$2f$estree$2d$util$2d$create$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["create"])(specifier.local, importSpecifier);
                            specifiers.push(importSpecifier);
                        }
                        /** @type {Literal} */ const from = {
                            type: 'Literal',
                            value: source.value
                        };
                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$mdx$2d$js$2b$mdx$40$3$2e$1$2e$0_acorn$40$8$2e$14$2e$0$2f$node_modules$2f40$mdx$2d$js$2f$mdx$2f$lib$2f$util$2f$estree$2d$util$2d$create$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["create"])(source, from);
                        /** @type {ImportDeclaration} */ const declaration = {
                            type: 'ImportDeclaration',
                            specifiers,
                            source: from
                        };
                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$mdx$2d$js$2b$mdx$40$3$2e$1$2e$0_acorn$40$8$2e$14$2e$0$2f$node_modules$2f40$mdx$2d$js$2f$mdx$2f$lib$2f$util$2f$estree$2d$util$2d$create$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["create"])(specifier, declaration);
                        handleEsm(declaration);
                        return false;
                    }
                    return true;
                });
                // If there are other things imported, keep it.
                if (child.specifiers.length > 0) {
                    handleExport(child);
                }
            } else if (child.type === 'ExportNamedDeclaration' || child.type === 'ExportAllDeclaration') {
                handleExport(child);
            } else if (child.type === 'ImportDeclaration') {
                handleEsm(child);
            } else if (child.type === 'ExpressionStatement' && (child.expression.type === 'JSXElement' || child.expression.type === 'JSXFragment')) {
                content = true;
                replacement.push(...createMdxContent(child.expression, outputFormat, Boolean(layout)));
            } else {
                // This catch-all branch is because plugins might add other things.
                // Normally, we only have import/export/jsx, but just add whatever’s
                // there.
                replacement.push(child);
            }
        }
        // If there was no JSX content at all, add an empty function.
        if (!content) {
            replacement.push(...createMdxContent(undefined, outputFormat, Boolean(layout)));
        }
        exportedValues.push([
            'MDXContent',
            'default'
        ]);
        if (outputFormat === 'function-body') {
            replacement.push({
                type: 'ReturnStatement',
                argument: {
                    type: 'ObjectExpression',
                    properties: [
                        ...Array.from({
                            length: exportAllCount
                        }).map(/**
               * @param {undefined} _
               *   Nothing.
               * @param {number} index
               *   Index.
               * @returns {SpreadElement}
               *   Node.
               */ function(_, index) {
                            return {
                                type: 'SpreadElement',
                                argument: {
                                    type: 'Identifier',
                                    name: '_exportAll' + (index + 1)
                                }
                            };
                        }),
                        ...exportedValues.map(function(d) {
                            /** @type {Property} */ const property = {
                                type: 'Property',
                                kind: 'init',
                                method: false,
                                computed: false,
                                shorthand: typeof d === 'string',
                                key: {
                                    type: 'Identifier',
                                    name: typeof d === 'string' ? d : d[1]
                                },
                                value: {
                                    type: 'Identifier',
                                    name: typeof d === 'string' ? d : d[0]
                                }
                            };
                            return property;
                        })
                    ]
                }
            });
        }
        tree.body = replacement;
        let usesImportMetaUrlVariable = false;
        let usesResolveDynamicHelper = false;
        if (baseHref || outputFormat === 'function-body') {
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$estree$2d$walker$40$3$2e$0$2e$3$2f$node_modules$2f$estree$2d$walker$2f$src$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["walk"])(tree, {
                enter (node) {
                    if ((node.type === 'ExportAllDeclaration' || node.type === 'ExportNamedDeclaration' || node.type === 'ImportDeclaration') && node.source) {
                        // We never hit this branch when generating function bodies, as
                        // statements are already compiled away into import expressions.
                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$devlop$40$1$2e$1$2e$0$2f$node_modules$2f$devlop$2f$lib$2f$development$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ok"])(baseHref, 'unexpected missing `baseHref` in branch');
                        let value = node.source.value;
                        // The literal source for statements can only be string.
                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$devlop$40$1$2e$1$2e$0$2f$node_modules$2f$devlop$2f$lib$2f$development$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ok"])(typeof value === 'string', 'expected string source');
                        // Resolve a specifier.
                        // This is the same as `_resolveDynamicMdxSpecifier`, which has to
                        // be injected to work with expressions at runtime, but as we have
                        // `baseHref` at compile time here and statements are static
                        // strings, we can do it now.
                        try {
                            // To do: next major: use `URL.canParse`.
                            // eslint-disable-next-line no-new
                            new URL(value);
                        // Fine: a full URL.
                        } catch  {
                            if (value.startsWith('/') || value.startsWith('./') || value.startsWith('../')) {
                                value = new URL(value, baseHref).href;
                            } else {
                            // Fine: are bare specifier.
                            }
                        }
                        /** @type {SimpleLiteral} */ const replacement = {
                            type: 'Literal',
                            value
                        };
                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$mdx$2d$js$2b$mdx$40$3$2e$1$2e$0_acorn$40$8$2e$14$2e$0$2f$node_modules$2f40$mdx$2d$js$2f$mdx$2f$lib$2f$util$2f$estree$2d$util$2d$create$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["create"])(node.source, replacement);
                        node.source = replacement;
                        return;
                    }
                    if (node.type === 'ImportExpression') {
                        usesResolveDynamicHelper = true;
                        /** @type {CallExpression} */ const replacement = {
                            type: 'CallExpression',
                            callee: {
                                type: 'Identifier',
                                name: '_resolveDynamicMdxSpecifier'
                            },
                            arguments: [
                                node.source
                            ],
                            optional: false
                        };
                        node.source = replacement;
                        return;
                    }
                    // To do: add support for `import.meta.resolve`.
                    if (node.type === 'MemberExpression' && 'object' in node && node.object.type === 'MetaProperty' && node.property.type === 'Identifier' && node.object.meta.name === 'import' && node.object.property.name === 'meta' && node.property.name === 'url') {
                        usesImportMetaUrlVariable = true;
                        /** @type {Identifier} */ const replacement = {
                            type: 'Identifier',
                            name: '_importMetaUrl'
                        };
                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$mdx$2d$js$2b$mdx$40$3$2e$1$2e$0_acorn$40$8$2e$14$2e$0$2f$node_modules$2f40$mdx$2d$js$2f$mdx$2f$lib$2f$util$2f$estree$2d$util$2d$create$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["create"])(node, replacement);
                        this.replace(replacement);
                    }
                }
            });
        }
        if (usesResolveDynamicHelper) {
            if (!baseHref) {
                usesImportMetaUrlVariable = true;
            }
            tree.body.push(resolveDynamicMdxSpecifier(baseHref ? {
                type: 'Literal',
                value: baseHref
            } : {
                type: 'Identifier',
                name: '_importMetaUrl'
            }));
        }
        if (usesImportMetaUrlVariable) {
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$devlop$40$1$2e$1$2e$0$2f$node_modules$2f$devlop$2f$lib$2f$development$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ok"])(outputFormat === 'function-body', 'expected `function-body` when using dynamic url injection');
            tree.body.unshift(...createImportMetaUrlVariable());
        }
        /**
     * @param {ExportAllDeclaration | ExportNamedDeclaration} node
     *   Export node.
     * @returns {undefined}
     *   Nothing.
     */ function handleExport(node) {
            if (node.type === 'ExportNamedDeclaration') {
                // ```tsx
                // export function a() {}
                // export class A {}
                // export var a = 1
                // ```
                if (node.declaration) {
                    const visitors = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$estree$2d$util$2d$scope$40$1$2e$0$2e$0$2f$node_modules$2f$estree$2d$util$2d$scope$2f$lib$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createVisitors"])();
                    // Walk the top-level scope.
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$estree$2d$walker$40$3$2e$0$2e$3$2f$node_modules$2f$estree$2d$walker$2f$src$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["walk"])(node, {
                        enter (node) {
                            visitors.enter(node);
                            if (node.type === 'ArrowFunctionExpression' || node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression') {
                                this.skip();
                                visitors.exit(node);
                            }
                        },
                        leave: visitors.exit
                    });
                    exportedValues.push(...visitors.scopes[0].defined);
                }
                // ```tsx
                // export {a, b as c}
                // export {a, b as c} from 'd'
                // ```
                for (child of node.specifiers){
                    if (child.exported.type === 'Identifier') {
                        exportedValues.push(child.exported.name);
                    /* c8 ignore next 5 -- to do: <https://github.com/mdx-js/mdx/issues/2536> */ } else {
                        // Must be string.
                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$devlop$40$1$2e$1$2e$0$2f$node_modules$2f$devlop$2f$lib$2f$development$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ok"])(typeof child.exported.value === 'string');
                        exportedValues.push(child.exported.value);
                    }
                }
            }
            handleEsm(node);
        }
        /**
     * @param {ExportAllDeclaration | ExportNamedDeclaration | ImportDeclaration} node
     *   Export or import node.
     * @returns {undefined}
     *   Nothing.
     */ function handleEsm(node) {
            /** @type {ModuleDeclaration | Statement | undefined} */ let replace;
            /** @type {Expression} */ let init;
            if (outputFormat === 'function-body') {
                if (// Always have a source:
                node.type === 'ImportDeclaration' || node.type === 'ExportAllDeclaration' || node.type === 'ExportNamedDeclaration' && node.source) {
                    // We always have a source, but types say they can be missing.
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$devlop$40$1$2e$1$2e$0$2f$node_modules$2f$devlop$2f$lib$2f$development$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ok"])(node.source, 'expected `node.source` to be defined');
                    // ```
                    // import 'a'
                    // //=> await import('a')
                    // import a from 'b'
                    // //=> const {default: a} = await import('b')
                    // export {a, b as c} from 'd'
                    // //=> const {a, c: b} = await import('d')
                    // export * from 'a'
                    // //=> const _exportAll0 = await import('a')
                    // ```
                    /** @type {ImportExpression} */ const argument = {
                        type: 'ImportExpression',
                        source: node.source
                    };
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$mdx$2d$js$2b$mdx$40$3$2e$1$2e$0_acorn$40$8$2e$14$2e$0$2f$node_modules$2f40$mdx$2d$js$2f$mdx$2f$lib$2f$util$2f$estree$2d$util$2d$create$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["create"])(node, argument);
                    init = {
                        type: 'AwaitExpression',
                        argument
                    };
                    if ((node.type === 'ImportDeclaration' || node.type === 'ExportNamedDeclaration') && node.specifiers.length === 0) {
                        replace = {
                            type: 'ExpressionStatement',
                            expression: init
                        };
                    } else {
                        replace = {
                            type: 'VariableDeclaration',
                            kind: 'const',
                            declarations: node.type === 'ExportAllDeclaration' ? [
                                {
                                    type: 'VariableDeclarator',
                                    id: {
                                        type: 'Identifier',
                                        name: '_exportAll' + ++exportAllCount
                                    },
                                    init
                                }
                            ] : (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$mdx$2d$js$2b$mdx$40$3$2e$1$2e$0_acorn$40$8$2e$14$2e$0$2f$node_modules$2f40$mdx$2d$js$2f$mdx$2f$lib$2f$util$2f$estree$2d$util$2d$specifiers$2d$to$2d$declarations$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["specifiersToDeclarations"])(node.specifiers, init)
                        };
                    }
                } else if (node.declaration) {
                    replace = node.declaration;
                } else {
                    /** @type {Array<VariableDeclarator>} */ const declarators = [];
                    for (const specifier of node.specifiers){
                        // `id` can only be an identifier,
                        // so we ignore literal.
                        if (specifier.exported.type === 'Identifier' && specifier.local.type === 'Identifier' && specifier.local.name !== specifier.exported.name) {
                            declarators.push({
                                type: 'VariableDeclarator',
                                id: specifier.exported,
                                init: specifier.local
                            });
                        }
                    }
                    if (declarators.length > 0) {
                        replace = {
                            type: 'VariableDeclaration',
                            kind: 'const',
                            declarations: declarators
                        };
                    }
                }
            } else {
                replace = node;
            }
            if (replace) {
                replacement.push(replace);
            }
        }
    };
    "TURBOPACK unreachable";
    /**
   * @param {Readonly<Expression> | undefined} content
   *   Content.
   * @param {'function-body' | 'program'} outputFormat
   *   Output format.
   * @param {boolean | undefined} [hasInternalLayout=false]
   *   Whether there’s an internal layout (default: `false`).
   * @returns {Array<ExportDefaultDeclaration | FunctionDeclaration>}
   *   Functions.
   */ function createMdxContent(content, outputFormat, hasInternalLayout) {
        /** @type {JSXElement} */ const element = {
            type: 'JSXElement',
            openingElement: {
                type: 'JSXOpeningElement',
                name: {
                    type: 'JSXIdentifier',
                    name: 'MDXLayout'
                },
                attributes: [
                    {
                        type: 'JSXSpreadAttribute',
                        argument: {
                            type: 'Identifier',
                            name: 'props'
                        }
                    }
                ],
                selfClosing: false
            },
            closingElement: {
                type: 'JSXClosingElement',
                name: {
                    type: 'JSXIdentifier',
                    name: 'MDXLayout'
                }
            },
            children: [
                {
                    type: 'JSXElement',
                    openingElement: {
                        type: 'JSXOpeningElement',
                        name: {
                            type: 'JSXIdentifier',
                            name: '_createMdxContent'
                        },
                        attributes: [
                            {
                                type: 'JSXSpreadAttribute',
                                argument: {
                                    type: 'Identifier',
                                    name: 'props'
                                }
                            }
                        ],
                        selfClosing: true
                    },
                    closingElement: null,
                    children: []
                }
            ]
        };
        let result = element;
        if (!hasInternalLayout) {
            result = {
                type: 'ConditionalExpression',
                test: {
                    type: 'Identifier',
                    name: 'MDXLayout'
                },
                consequent: result,
                alternate: {
                    type: 'CallExpression',
                    callee: {
                        type: 'Identifier',
                        name: '_createMdxContent'
                    },
                    arguments: [
                        {
                            type: 'Identifier',
                            name: 'props'
                        }
                    ],
                    optional: false
                }
            };
        }
        let argument = content || {
            type: 'Identifier',
            name: 'undefined'
        };
        // Unwrap a fragment of a single element.
        if (argument.type === 'JSXFragment' && argument.children.length === 1 && argument.children[0].type === 'JSXElement') {
            argument = argument.children[0];
        }
        let awaitExpression = false;
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$estree$2d$walker$40$3$2e$0$2e$3$2f$node_modules$2f$estree$2d$walker$2f$src$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["walk"])(argument, {
            enter (node) {
                if (node.type === 'ArrowFunctionExpression' || node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression') {
                    return this.skip();
                }
                if (node.type === 'AwaitExpression' || node.type === 'ForOfStatement' && node.await) {
                    awaitExpression = true;
                }
            }
        });
        /** @type {FunctionDeclaration} */ const declaration = {
            type: 'FunctionDeclaration',
            id: {
                type: 'Identifier',
                name: 'MDXContent'
            },
            params: [
                {
                    type: 'AssignmentPattern',
                    left: {
                        type: 'Identifier',
                        name: 'props'
                    },
                    right: {
                        type: 'ObjectExpression',
                        properties: []
                    }
                }
            ],
            body: {
                type: 'BlockStatement',
                body: [
                    {
                        type: 'ReturnStatement',
                        argument: result
                    }
                ]
            }
        };
        return [
            {
                type: 'FunctionDeclaration',
                async: awaitExpression,
                id: {
                    type: 'Identifier',
                    name: '_createMdxContent'
                },
                params: [
                    {
                        type: 'Identifier',
                        name: 'props'
                    }
                ],
                body: {
                    type: 'BlockStatement',
                    body: [
                        {
                            type: 'ReturnStatement',
                            // Cast because TS doesn’t think `JSXFragment` is an expression.
                            // eslint-disable-next-line object-shorthand
                            argument: argument
                        }
                    ]
                }
            },
            outputFormat === 'program' ? {
                type: 'ExportDefaultDeclaration',
                declaration
            } : declaration
        ];
    }
}
/**
 * @param {Program} tree
 * @param {string} name
 * @param {string} value
 * @returns {undefined}
 */ function injectPragma(tree, name, value) {
    tree.comments?.unshift({
        type: 'Block',
        value: name + ' ' + value,
        data: {
            _mdxIsPragmaComment: true
        }
    });
}
/**
 * @param {Expression} importMetaUrl
 * @returns {FunctionDeclaration}
 */ function resolveDynamicMdxSpecifier(importMetaUrl) {
    return {
        type: 'FunctionDeclaration',
        id: {
            type: 'Identifier',
            name: '_resolveDynamicMdxSpecifier'
        },
        generator: false,
        async: false,
        params: [
            {
                type: 'Identifier',
                name: 'd'
            }
        ],
        body: {
            type: 'BlockStatement',
            body: [
                {
                    type: 'IfStatement',
                    test: {
                        type: 'BinaryExpression',
                        left: {
                            type: 'UnaryExpression',
                            operator: 'typeof',
                            prefix: true,
                            argument: {
                                type: 'Identifier',
                                name: 'd'
                            }
                        },
                        operator: '!==',
                        right: {
                            type: 'Literal',
                            value: 'string'
                        }
                    },
                    consequent: {
                        type: 'ReturnStatement',
                        argument: {
                            type: 'Identifier',
                            name: 'd'
                        }
                    },
                    alternate: null
                },
                // To do: use `URL.canParse` when widely supported (see commented
                // out code below).
                {
                    type: 'TryStatement',
                    block: {
                        type: 'BlockStatement',
                        body: [
                            {
                                type: 'ExpressionStatement',
                                expression: {
                                    type: 'NewExpression',
                                    callee: {
                                        type: 'Identifier',
                                        name: 'URL'
                                    },
                                    arguments: [
                                        {
                                            type: 'Identifier',
                                            name: 'd'
                                        }
                                    ]
                                }
                            },
                            {
                                type: 'ReturnStatement',
                                argument: {
                                    type: 'Identifier',
                                    name: 'd'
                                }
                            }
                        ]
                    },
                    handler: {
                        type: 'CatchClause',
                        param: null,
                        body: {
                            type: 'BlockStatement',
                            body: []
                        }
                    },
                    finalizer: null
                },
                // To do: use `URL.canParse` when widely supported.
                // {
                //   type: 'IfStatement',
                //   test: {
                //     type: 'CallExpression',
                //     callee: toIdOrMemberExpression(['URL', 'canParse']),
                //     arguments: [{type: 'Identifier', name: 'd'}],
                //     optional: false
                //   },
                //   consequent: {
                //     type: 'ReturnStatement',
                //     argument: {type: 'Identifier', name: 'd'}
                //   },
                //   alternate: null
                // },
                {
                    type: 'IfStatement',
                    test: {
                        type: 'LogicalExpression',
                        left: {
                            type: 'LogicalExpression',
                            left: {
                                type: 'CallExpression',
                                callee: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$mdx$2d$js$2b$mdx$40$3$2e$1$2e$0_acorn$40$8$2e$14$2e$0$2f$node_modules$2f40$mdx$2d$js$2f$mdx$2f$lib$2f$util$2f$estree$2d$util$2d$to$2d$id$2d$or$2d$member$2d$expression$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["toIdOrMemberExpression"])([
                                    'd',
                                    'startsWith'
                                ]),
                                arguments: [
                                    {
                                        type: 'Literal',
                                        value: '/'
                                    }
                                ],
                                optional: false
                            },
                            operator: '||',
                            right: {
                                type: 'CallExpression',
                                callee: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$mdx$2d$js$2b$mdx$40$3$2e$1$2e$0_acorn$40$8$2e$14$2e$0$2f$node_modules$2f40$mdx$2d$js$2f$mdx$2f$lib$2f$util$2f$estree$2d$util$2d$to$2d$id$2d$or$2d$member$2d$expression$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["toIdOrMemberExpression"])([
                                    'd',
                                    'startsWith'
                                ]),
                                arguments: [
                                    {
                                        type: 'Literal',
                                        value: './'
                                    }
                                ],
                                optional: false
                            }
                        },
                        operator: '||',
                        right: {
                            type: 'CallExpression',
                            callee: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$mdx$2d$js$2b$mdx$40$3$2e$1$2e$0_acorn$40$8$2e$14$2e$0$2f$node_modules$2f40$mdx$2d$js$2f$mdx$2f$lib$2f$util$2f$estree$2d$util$2d$to$2d$id$2d$or$2d$member$2d$expression$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["toIdOrMemberExpression"])([
                                'd',
                                'startsWith'
                            ]),
                            arguments: [
                                {
                                    type: 'Literal',
                                    value: '../'
                                }
                            ],
                            optional: false
                        }
                    },
                    consequent: {
                        type: 'ReturnStatement',
                        argument: {
                            type: 'MemberExpression',
                            object: {
                                type: 'NewExpression',
                                callee: {
                                    type: 'Identifier',
                                    name: 'URL'
                                },
                                arguments: [
                                    {
                                        type: 'Identifier',
                                        name: 'd'
                                    },
                                    importMetaUrl
                                ]
                            },
                            property: {
                                type: 'Identifier',
                                name: 'href'
                            },
                            computed: false,
                            optional: false
                        }
                    },
                    alternate: null
                },
                {
                    type: 'ReturnStatement',
                    argument: {
                        type: 'Identifier',
                        name: 'd'
                    }
                }
            ]
        }
    };
}
/**
 * @returns {Array<Statement>}
 */ function createImportMetaUrlVariable() {
    return [
        {
            type: 'VariableDeclaration',
            declarations: [
                {
                    type: 'VariableDeclarator',
                    id: {
                        type: 'Identifier',
                        name: '_importMetaUrl'
                    },
                    init: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$mdx$2d$js$2b$mdx$40$3$2e$1$2e$0_acorn$40$8$2e$14$2e$0$2f$node_modules$2f40$mdx$2d$js$2f$mdx$2f$lib$2f$util$2f$estree$2d$util$2d$to$2d$id$2d$or$2d$member$2d$expression$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["toIdOrMemberExpression"])([
                        'arguments',
                        0,
                        'baseUrl'
                    ])
                }
            ],
            kind: 'const'
        },
        {
            type: 'IfStatement',
            test: {
                type: 'UnaryExpression',
                operator: '!',
                prefix: true,
                argument: {
                    type: 'Identifier',
                    name: '_importMetaUrl'
                }
            },
            consequent: {
                type: 'ThrowStatement',
                argument: {
                    type: 'NewExpression',
                    callee: {
                        type: 'Identifier',
                        name: 'Error'
                    },
                    arguments: [
                        {
                            type: 'Literal',
                            value: 'Unexpected missing `options.baseUrl` needed to support `export … from`, `import`, or `import.meta.url` when generating `function-body`'
                        }
                    ]
                }
            },
            alternate: null
        }
    ];
}
}}),
"[project]/node_modules/.pnpm/@mdx-js+mdx@3.1.0_acorn@8.14.0/node_modules/@mdx-js/mdx/lib/util/estree-util-to-binary-addition.js [app-rsc] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { r: __turbopack_require__, f: __turbopack_module_context__, i: __turbopack_import__, s: __turbopack_esm__, v: __turbopack_export_value__, n: __turbopack_export_namespace__, c: __turbopack_cache__, M: __turbopack_modules__, l: __turbopack_load__, j: __turbopack_dynamic__, P: __turbopack_resolve_absolute_path__, U: __turbopack_relative_url__, R: __turbopack_resolve_module_id_path__, b: __turbopack_worker_blob_url__, g: global, __dirname, x: __turbopack_external_require__, y: __turbopack_external_import__, z: __turbopack_require_stub__ } = __turbopack_context__;
{
/**
 * @import {Expression} from 'estree-jsx'
 */ __turbopack_esm__({
    "toBinaryAddition": (()=>toBinaryAddition)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$devlop$40$1$2e$1$2e$0$2f$node_modules$2f$devlop$2f$lib$2f$development$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/devlop@1.1.0/node_modules/devlop/lib/development.js [app-rsc] (ecmascript)");
;
function toBinaryAddition(expressions) {
    let index = -1;
    /** @type {Expression | undefined} */ let left;
    while(++index < expressions.length){
        const right = expressions[index];
        left = left ? {
            type: 'BinaryExpression',
            left,
            operator: '+',
            right
        } : right;
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$devlop$40$1$2e$1$2e$0$2f$node_modules$2f$devlop$2f$lib$2f$development$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ok"])(left, 'expected non-empty `expressions` to be passed');
    return left;
}
}}),
"[project]/node_modules/.pnpm/@mdx-js+mdx@3.1.0_acorn@8.14.0/node_modules/@mdx-js/mdx/lib/plugin/recma-jsx-rewrite.js [app-rsc] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { r: __turbopack_require__, f: __turbopack_module_context__, i: __turbopack_import__, s: __turbopack_esm__, v: __turbopack_export_value__, n: __turbopack_export_namespace__, c: __turbopack_cache__, M: __turbopack_modules__, l: __turbopack_load__, j: __turbopack_dynamic__, P: __turbopack_resolve_absolute_path__, U: __turbopack_relative_url__, R: __turbopack_resolve_module_id_path__, b: __turbopack_worker_blob_url__, g: global, __dirname, x: __turbopack_external_require__, y: __turbopack_external_import__, z: __turbopack_require_stub__ } = __turbopack_context__;
{
/**
 * @import {
      Expression,
      Function as EstreeFunction,
      Identifier,
      ImportSpecifier,
      JSXElement,
      ModuleDeclaration,
      ObjectPattern,
      Program,
      Property,
      SpreadElement,
      Statement,
      VariableDeclarator
 * } from 'estree-jsx'
 * @import {Scope} from 'estree-util-scope'
 * @import {VFile} from 'vfile'
 * @import {ProcessorOptions} from '../core.js'
 */ /**
 * @typedef StackEntry
 *   Entry.
 * @property {Array<string>} components
 *   Used components.
 * @property {Map<string, string>} idToInvalidComponentName
 *   Map of JSX identifiers which cannot be used as JS identifiers, to valid JS identifiers.
 * @property {Readonly<EstreeFunction>} node
 *   Function.
 * @property {Array<string>} objects
 *   Identifiers of used objects (such as `x` in `x.y`).
 * @property {Record<string, {node: Readonly<JSXElement>, component: boolean}>} references
 *   Map of JSX identifiers for components and objects, to where they were first used.
 * @property {Array<string>} tags
 *   Tag names.
 */ __turbopack_esm__({
    "recmaJsxRewrite": (()=>recmaJsxRewrite)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$estree$2d$walker$40$3$2e$0$2e$3$2f$node_modules$2f$estree$2d$walker$2f$src$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/estree-walker@3.0.3/node_modules/estree-walker/src/index.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$estree$2d$util$2d$scope$40$1$2e$0$2e$0$2f$node_modules$2f$estree$2d$util$2d$scope$2f$lib$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/estree-util-scope@1.0.0/node_modules/estree-util-scope/lib/index.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$estree$2d$util$2d$is$2d$identifier$2d$name$40$3$2e$0$2e$0$2f$node_modules$2f$estree$2d$util$2d$is$2d$identifier$2d$name$2f$lib$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/estree-util-is-identifier-name@3.0.0/node_modules/estree-util-is-identifier-name/lib/index.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$mdx$2d$js$2b$mdx$40$3$2e$1$2e$0_acorn$40$8$2e$14$2e$0$2f$node_modules$2f40$mdx$2d$js$2f$mdx$2f$lib$2f$util$2f$estree$2d$util$2d$to$2d$id$2d$or$2d$member$2d$expression$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/@mdx-js+mdx@3.1.0_acorn@8.14.0/node_modules/@mdx-js/mdx/lib/util/estree-util-to-id-or-member-expression.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$unist$2d$util$2d$stringify$2d$position$40$4$2e$0$2e$0$2f$node_modules$2f$unist$2d$util$2d$stringify$2d$position$2f$lib$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/unist-util-stringify-position@4.0.0/node_modules/unist-util-stringify-position/lib/index.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$unist$2d$util$2d$position$2d$from$2d$estree$40$2$2e$0$2e$0$2f$node_modules$2f$unist$2d$util$2d$position$2d$from$2d$estree$2f$lib$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/unist-util-position-from-estree@2.0.0/node_modules/unist-util-position-from-estree/lib/index.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$mdx$2d$js$2b$mdx$40$3$2e$1$2e$0_acorn$40$8$2e$14$2e$0$2f$node_modules$2f40$mdx$2d$js$2f$mdx$2f$lib$2f$util$2f$estree$2d$util$2d$to$2d$binary$2d$addition$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/@mdx-js+mdx@3.1.0_acorn@8.14.0/node_modules/@mdx-js/mdx/lib/util/estree-util-to-binary-addition.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$mdx$2d$js$2b$mdx$40$3$2e$1$2e$0_acorn$40$8$2e$14$2e$0$2f$node_modules$2f40$mdx$2d$js$2f$mdx$2f$lib$2f$util$2f$estree$2d$util$2d$specifiers$2d$to$2d$declarations$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/@mdx-js+mdx@3.1.0_acorn@8.14.0/node_modules/@mdx-js/mdx/lib/util/estree-util-specifiers-to-declarations.js [app-rsc] (ecmascript)");
;
;
;
;
;
;
;
;
function recmaJsxRewrite(options) {
    const { development, outputFormat, providerImportSource } = options;
    /**
   * @param {Program} tree
   *   Tree.
   * @param {VFile} file
   *   File.
   * @returns {undefined}
   *   Nothing.
   */ return function(tree, file) {
        const visitors = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$estree$2d$util$2d$scope$40$1$2e$0$2e$0$2f$node_modules$2f$estree$2d$util$2d$scope$2f$lib$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createVisitors"])();
        /** @type {Array<StackEntry>} */ const functionStack = [];
        let importProvider = false;
        let createErrorHelper = false;
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$estree$2d$walker$40$3$2e$0$2e$3$2f$node_modules$2f$estree$2d$walker$2f$src$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["walk"])(tree, {
            enter (node) {
                visitors.enter(node);
                if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') {
                    functionStack.push({
                        components: [],
                        idToInvalidComponentName: new Map(),
                        node,
                        objects: [],
                        references: {},
                        tags: []
                    });
                    // `MDXContent` only ever contains `MDXLayout`.
                    if (isNamedFunction(node, 'MDXContent') && !inScope(visitors.scopes, 'MDXLayout')) {
                        functionStack[0].components.push('MDXLayout');
                    }
                }
                const functionInfo = functionStack[0];
                if (!functionInfo || !isNamedFunction(functionInfo.node, '_createMdxContent') && !providerImportSource) {
                    return;
                }
                if (node.type === 'JSXElement') {
                    let name = node.openingElement.name;
                    // `<x.y>`, `<Foo.Bar>`, `<x.y.z>`.
                    if (name.type === 'JSXMemberExpression') {
                        /** @type {Array<string>} */ const ids = [];
                        // Find the left-most identifier.
                        while(name.type === 'JSXMemberExpression'){
                            ids.unshift(name.property.name);
                            name = name.object;
                        }
                        ids.unshift(name.name);
                        const fullId = ids.join('.');
                        const id = name.name;
                        const isInScope = inScope(visitors.scopes, id);
                        if (!Object.hasOwn(functionInfo.references, fullId) && (!isInScope || functionStack.length === 1 && functionStack[0].node.type === 'FunctionDeclaration' && isNamedFunction(functionStack[0].node, '_createMdxContent'))) {
                            functionInfo.references[fullId] = {
                                component: true,
                                node
                            };
                        }
                        if (!functionInfo.objects.includes(id) && !isInScope) {
                            functionInfo.objects.push(id);
                        }
                    } else if (name.type === 'JSXNamespacedName') {
                    // Ignore namespaces.
                    } else if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$estree$2d$util$2d$is$2d$identifier$2d$name$40$3$2e$0$2e$0$2f$node_modules$2f$estree$2d$util$2d$is$2d$identifier$2d$name$2f$lib$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["name"])(name.name) && !/^[a-z]/.test(name.name)) {
                        const id = name.name;
                        if (!inScope(visitors.scopes, id)) {
                            // No need to add an error for an undefined layout — we use an
                            // `if` later.
                            if (id !== 'MDXLayout' && !Object.hasOwn(functionInfo.references, id)) {
                                functionInfo.references[id] = {
                                    component: true,
                                    node
                                };
                            }
                            if (!functionInfo.components.includes(id)) {
                                functionInfo.components.push(id);
                            }
                        }
                    } else if (node.data && node.data._mdxExplicitJsx) {
                    // Do not turn explicit JSX into components from `_components`.
                    // As in, a given `h1` component is used for `# heading` (next case),
                    // but not for `<h1>heading</h1>`.
                    } else {
                        const id = name.name;
                        if (!functionInfo.tags.includes(id)) {
                            functionInfo.tags.push(id);
                        }
                        /** @type {Array<number | string>} */ let jsxIdExpression = [
                            '_components',
                            id
                        ];
                        if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$estree$2d$util$2d$is$2d$identifier$2d$name$40$3$2e$0$2e$0$2f$node_modules$2f$estree$2d$util$2d$is$2d$identifier$2d$name$2f$lib$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["name"])(id) === false) {
                            let invalidComponentName = functionInfo.idToInvalidComponentName.get(id);
                            if (invalidComponentName === undefined) {
                                invalidComponentName = `_component${functionInfo.idToInvalidComponentName.size}`;
                                functionInfo.idToInvalidComponentName.set(id, invalidComponentName);
                            }
                            jsxIdExpression = [
                                invalidComponentName
                            ];
                        }
                        node.openingElement.name = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$mdx$2d$js$2b$mdx$40$3$2e$1$2e$0_acorn$40$8$2e$14$2e$0$2f$node_modules$2f40$mdx$2d$js$2f$mdx$2f$lib$2f$util$2f$estree$2d$util$2d$to$2d$id$2d$or$2d$member$2d$expression$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["toJsxIdOrMemberExpression"])(jsxIdExpression);
                        if (node.closingElement) {
                            node.closingElement.name = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$mdx$2d$js$2b$mdx$40$3$2e$1$2e$0_acorn$40$8$2e$14$2e$0$2f$node_modules$2f40$mdx$2d$js$2f$mdx$2f$lib$2f$util$2f$estree$2d$util$2d$to$2d$id$2d$or$2d$member$2d$expression$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["toJsxIdOrMemberExpression"])(jsxIdExpression);
                        }
                    }
                }
            },
            leave (node) {
                visitors.exit(node);
                /** @type {Array<Property | SpreadElement>} */ const defaults = [];
                /** @type {Array<string>} */ const actual = [];
                /** @type {Array<Expression>} */ const parameters = [];
                /** @type {Array<VariableDeclarator>} */ const declarations = [];
                if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') {
                    const functionInfo = functionStack[functionStack.length - 1];
                    /** @type {string} */ let name;
                    for (name of functionInfo.tags.sort()){
                        defaults.push({
                            type: 'Property',
                            kind: 'init',
                            key: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$estree$2d$util$2d$is$2d$identifier$2d$name$40$3$2e$0$2e$0$2f$node_modules$2f$estree$2d$util$2d$is$2d$identifier$2d$name$2f$lib$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["name"])(name) ? {
                                type: 'Identifier',
                                name
                            } : {
                                type: 'Literal',
                                value: name
                            },
                            value: {
                                type: 'Literal',
                                value: name
                            },
                            method: false,
                            shorthand: false,
                            computed: false
                        });
                    }
                    actual.push(...functionInfo.components);
                    for (name of functionInfo.objects){
                        // In some cases, a component is used directly (`<X>`) but it’s also
                        // used as an object (`<X.Y>`).
                        if (!actual.includes(name)) {
                            actual.push(name);
                        }
                    }
                    actual.sort();
                    /** @type {Array<Statement>} */ const statements = [];
                    if (defaults.length > 0 || actual.length > 0 || functionInfo.idToInvalidComponentName.size > 0) {
                        if (providerImportSource) {
                            importProvider = true;
                            parameters.push({
                                type: 'CallExpression',
                                callee: {
                                    type: 'Identifier',
                                    name: '_provideComponents'
                                },
                                arguments: [],
                                optional: false
                            });
                        }
                        // Accept `components` as a prop if this is the `MDXContent` or
                        // `_createMdxContent` function.
                        if (isNamedFunction(functionInfo.node, 'MDXContent') || isNamedFunction(functionInfo.node, '_createMdxContent')) {
                            parameters.push((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$mdx$2d$js$2b$mdx$40$3$2e$1$2e$0_acorn$40$8$2e$14$2e$0$2f$node_modules$2f40$mdx$2d$js$2f$mdx$2f$lib$2f$util$2f$estree$2d$util$2d$to$2d$id$2d$or$2d$member$2d$expression$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["toIdOrMemberExpression"])([
                                'props',
                                'components'
                            ]));
                        }
                        if (defaults.length > 0 || parameters.length > 1) {
                            for (const parameter of parameters){
                                defaults.push({
                                    type: 'SpreadElement',
                                    argument: parameter
                                });
                            }
                        }
                        // If we’re getting components from several sources, merge them.
                        /** @type {Expression} */ let componentsInit = defaults.length > 0 ? {
                            type: 'ObjectExpression',
                            properties: defaults
                        } : // make sure it’s defined.
                        {
                            type: 'LogicalExpression',
                            operator: '||',
                            left: parameters[0],
                            right: {
                                type: 'ObjectExpression',
                                properties: []
                            }
                        };
                        /** @type {ObjectPattern | undefined} */ let componentsPattern;
                        // Add components to scope.
                        // For `['MyComponent', 'MDXLayout']` this generates:
                        // ```tsx
                        // const {MyComponent, wrapper: MDXLayout} = _components
                        // ```
                        // Note that MDXLayout is special as it’s taken from
                        // `_components.wrapper`.
                        if (actual.length > 0) {
                            componentsPattern = {
                                type: 'ObjectPattern',
                                properties: actual.map(function(name) {
                                    return {
                                        type: 'Property',
                                        kind: 'init',
                                        key: {
                                            type: 'Identifier',
                                            name: name === 'MDXLayout' ? 'wrapper' : name
                                        },
                                        value: {
                                            type: 'Identifier',
                                            name
                                        },
                                        method: false,
                                        shorthand: name !== 'MDXLayout',
                                        computed: false
                                    };
                                })
                            };
                        }
                        if (functionInfo.tags.length > 0) {
                            declarations.push({
                                type: 'VariableDeclarator',
                                id: {
                                    type: 'Identifier',
                                    name: '_components'
                                },
                                init: componentsInit
                            });
                            componentsInit = {
                                type: 'Identifier',
                                name: '_components'
                            };
                        }
                        if (isNamedFunction(functionInfo.node, '_createMdxContent')) {
                            for (const [id, componentName] of [
                                ...functionInfo.idToInvalidComponentName
                            ].sort(function([a], [b]) {
                                return a.localeCompare(b);
                            })){
                                // For JSX IDs that can’t be represented as JavaScript IDs (as in,
                                // those with dashes, such as `custom-element`), generate a
                                // separate variable that is a valid JS ID (such as `_component0`),
                                // and takes it from components:
                                // `const _component0 = _components['custom-element']`
                                declarations.push({
                                    type: 'VariableDeclarator',
                                    id: {
                                        type: 'Identifier',
                                        name: componentName
                                    },
                                    init: {
                                        type: 'MemberExpression',
                                        object: {
                                            type: 'Identifier',
                                            name: '_components'
                                        },
                                        property: {
                                            type: 'Literal',
                                            value: id
                                        },
                                        computed: true,
                                        optional: false
                                    }
                                });
                            }
                        }
                        if (componentsPattern) {
                            declarations.push({
                                type: 'VariableDeclarator',
                                id: componentsPattern,
                                init: componentsInit
                            });
                        }
                        if (declarations.length > 0) {
                            statements.push({
                                type: 'VariableDeclaration',
                                kind: 'const',
                                declarations
                            });
                        }
                    }
                    /** @type {string} */ let key;
                    // Add partials (so for `x.y.z` it’d generate `x` and `x.y` too).
                    for(key in functionInfo.references){
                        if (Object.hasOwn(functionInfo.references, key)) {
                            const parts = key.split('.');
                            let index = 0;
                            while(++index < parts.length){
                                const partial = parts.slice(0, index).join('.');
                                if (!Object.hasOwn(functionInfo.references, partial)) {
                                    functionInfo.references[partial] = {
                                        component: false,
                                        node: functionInfo.references[key].node
                                    };
                                }
                            }
                        }
                    }
                    const references = Object.keys(functionInfo.references).sort();
                    let index = -1;
                    while(++index < references.length){
                        const id = references[index];
                        const info = functionInfo.references[id];
                        const place = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$unist$2d$util$2d$stringify$2d$position$40$4$2e$0$2e$0$2f$node_modules$2f$unist$2d$util$2d$stringify$2d$position$2f$lib$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["stringifyPosition"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$unist$2d$util$2d$position$2d$from$2d$estree$40$2$2e$0$2e$0$2f$node_modules$2f$unist$2d$util$2d$position$2d$from$2d$estree$2f$lib$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["positionFromEstree"])(info.node));
                        /** @type {Array<Expression>} */ const parameters = [
                            {
                                type: 'Literal',
                                value: id
                            },
                            {
                                type: 'Literal',
                                value: info.component
                            }
                        ];
                        createErrorHelper = true;
                        if (development && place) {
                            parameters.push({
                                type: 'Literal',
                                value: place
                            });
                        }
                        statements.push({
                            type: 'IfStatement',
                            test: {
                                type: 'UnaryExpression',
                                operator: '!',
                                prefix: true,
                                argument: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$mdx$2d$js$2b$mdx$40$3$2e$1$2e$0_acorn$40$8$2e$14$2e$0$2f$node_modules$2f40$mdx$2d$js$2f$mdx$2f$lib$2f$util$2f$estree$2d$util$2d$to$2d$id$2d$or$2d$member$2d$expression$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["toIdOrMemberExpression"])(id.split('.'))
                            },
                            consequent: {
                                type: 'ExpressionStatement',
                                expression: {
                                    type: 'CallExpression',
                                    callee: {
                                        type: 'Identifier',
                                        name: '_missingMdxReference'
                                    },
                                    arguments: parameters,
                                    optional: false
                                }
                            },
                            alternate: undefined
                        });
                    }
                    if (statements.length > 0) {
                        // Arrow functions with an implied return:
                        if (node.body.type !== 'BlockStatement') {
                            node.body = {
                                type: 'BlockStatement',
                                body: [
                                    {
                                        type: 'ReturnStatement',
                                        argument: node.body
                                    }
                                ]
                            };
                        }
                        node.body.body.unshift(...statements);
                    }
                    functionStack.pop();
                }
            }
        });
        // If a provider is used (and can be used), import it.
        if (importProvider && providerImportSource) {
            tree.body.unshift(createImportProvider(providerImportSource, outputFormat));
        }
        // If potentially missing components are used.
        if (createErrorHelper) {
            /** @type {Array<Expression>} */ const message = [
                {
                    type: 'Literal',
                    value: 'Expected '
                },
                {
                    type: 'ConditionalExpression',
                    test: {
                        type: 'Identifier',
                        name: 'component'
                    },
                    consequent: {
                        type: 'Literal',
                        value: 'component'
                    },
                    alternate: {
                        type: 'Literal',
                        value: 'object'
                    }
                },
                {
                    type: 'Literal',
                    value: ' `'
                },
                {
                    type: 'Identifier',
                    name: 'id'
                },
                {
                    type: 'Literal',
                    value: '` to be defined: you likely forgot to import, pass, or provide it.'
                }
            ];
            /** @type {Array<Identifier>} */ const parameters = [
                {
                    type: 'Identifier',
                    name: 'id'
                },
                {
                    type: 'Identifier',
                    name: 'component'
                }
            ];
            if (development) {
                message.push({
                    type: 'ConditionalExpression',
                    test: {
                        type: 'Identifier',
                        name: 'place'
                    },
                    consequent: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$mdx$2d$js$2b$mdx$40$3$2e$1$2e$0_acorn$40$8$2e$14$2e$0$2f$node_modules$2f40$mdx$2d$js$2f$mdx$2f$lib$2f$util$2f$estree$2d$util$2d$to$2d$binary$2d$addition$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["toBinaryAddition"])([
                        {
                            type: 'Literal',
                            value: '\nIt’s referenced in your code at `'
                        },
                        {
                            type: 'Identifier',
                            name: 'place'
                        },
                        {
                            type: 'Literal',
                            value: (file.path ? '` in `' + file.path : '') + '`'
                        }
                    ]),
                    alternate: {
                        type: 'Literal',
                        value: ''
                    }
                });
                parameters.push({
                    type: 'Identifier',
                    name: 'place'
                });
            }
            tree.body.push({
                type: 'FunctionDeclaration',
                id: {
                    type: 'Identifier',
                    name: '_missingMdxReference'
                },
                generator: false,
                async: false,
                params: parameters,
                body: {
                    type: 'BlockStatement',
                    body: [
                        {
                            type: 'ThrowStatement',
                            argument: {
                                type: 'NewExpression',
                                callee: {
                                    type: 'Identifier',
                                    name: 'Error'
                                },
                                arguments: [
                                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$mdx$2d$js$2b$mdx$40$3$2e$1$2e$0_acorn$40$8$2e$14$2e$0$2f$node_modules$2f40$mdx$2d$js$2f$mdx$2f$lib$2f$util$2f$estree$2d$util$2d$to$2d$binary$2d$addition$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["toBinaryAddition"])(message)
                                ]
                            }
                        }
                    ]
                }
            });
        }
        if (outputFormat === 'function-body') {
            tree.body.unshift({
                type: 'ExpressionStatement',
                expression: {
                    type: 'Literal',
                    value: 'use strict'
                },
                directive: 'use strict'
            });
        }
    };
}
/**
 * @param {string} providerImportSource
 *   Provider source.
 * @param {'function-body' | 'program' | null | undefined} outputFormat
 *   Format.
 * @returns {ModuleDeclaration | Statement}
 *   Node.
 */ function createImportProvider(providerImportSource, outputFormat) {
    /** @type {Array<ImportSpecifier>} */ const specifiers = [
        {
            type: 'ImportSpecifier',
            imported: {
                type: 'Identifier',
                name: 'useMDXComponents'
            },
            local: {
                type: 'Identifier',
                name: '_provideComponents'
            }
        }
    ];
    return outputFormat === 'function-body' ? {
        type: 'VariableDeclaration',
        kind: 'const',
        declarations: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$mdx$2d$js$2b$mdx$40$3$2e$1$2e$0_acorn$40$8$2e$14$2e$0$2f$node_modules$2f40$mdx$2d$js$2f$mdx$2f$lib$2f$util$2f$estree$2d$util$2d$specifiers$2d$to$2d$declarations$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["specifiersToDeclarations"])(specifiers, (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$mdx$2d$js$2b$mdx$40$3$2e$1$2e$0_acorn$40$8$2e$14$2e$0$2f$node_modules$2f40$mdx$2d$js$2f$mdx$2f$lib$2f$util$2f$estree$2d$util$2d$to$2d$id$2d$or$2d$member$2d$expression$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["toIdOrMemberExpression"])([
            'arguments',
            0
        ]))
    } : {
        type: 'ImportDeclaration',
        specifiers,
        source: {
            type: 'Literal',
            value: providerImportSource
        }
    };
}
/**
 * @param {Readonly<EstreeFunction>} node
 *   Node.
 * @param {string} name
 *   Name.
 * @returns {boolean}
 *   Whether `node` is a named function with `name`.
 */ function isNamedFunction(node, name) {
    return Boolean(node && 'id' in node && node.id && node.id.name === name);
}
/**
 * @param {Array<Scope>} scopes
 *   Scope.
 * @param {string} id
 *   Identifier.
 * @returns {boolean}
 *   Whether `id` is in `scope`.
 */ function inScope(scopes, id) {
    let index = scopes.length;
    while(index--){
        const scope = scopes[index];
        if (scope.defined.includes(id)) {
            return true;
        }
    }
    return false;
}
}}),
"[project]/node_modules/.pnpm/@mdx-js+mdx@3.1.0_acorn@8.14.0/node_modules/@mdx-js/mdx/lib/plugin/recma-build-jsx-transform.js [app-rsc] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { r: __turbopack_require__, f: __turbopack_module_context__, i: __turbopack_import__, s: __turbopack_esm__, v: __turbopack_export_value__, n: __turbopack_export_namespace__, c: __turbopack_cache__, M: __turbopack_modules__, l: __turbopack_load__, j: __turbopack_dynamic__, P: __turbopack_resolve_absolute_path__, U: __turbopack_relative_url__, R: __turbopack_resolve_module_id_path__, b: __turbopack_worker_blob_url__, g: global, __dirname, x: __turbopack_external_require__, y: __turbopack_external_import__, z: __turbopack_require_stub__ } = __turbopack_context__;
{
/**
 * @import {Program} from 'estree-jsx'
 */ /**
 * @typedef Options
 *   Configuration for internal plugin `recma-build-jsx-transform`.
 * @property {'function-body' | 'program' | null | undefined} [outputFormat='program']
 *   Whether to keep the import of the automatic runtime or get it from
 *   `arguments[0]` instead (default: `'program'`).
 */ __turbopack_esm__({
    "recmaBuildJsxTransform": (()=>recmaBuildJsxTransform)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$mdx$2d$js$2b$mdx$40$3$2e$1$2e$0_acorn$40$8$2e$14$2e$0$2f$node_modules$2f40$mdx$2d$js$2f$mdx$2f$lib$2f$util$2f$estree$2d$util$2d$specifiers$2d$to$2d$declarations$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/@mdx-js+mdx@3.1.0_acorn@8.14.0/node_modules/@mdx-js/mdx/lib/util/estree-util-specifiers-to-declarations.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$mdx$2d$js$2b$mdx$40$3$2e$1$2e$0_acorn$40$8$2e$14$2e$0$2f$node_modules$2f40$mdx$2d$js$2f$mdx$2f$lib$2f$util$2f$estree$2d$util$2d$to$2d$id$2d$or$2d$member$2d$expression$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/@mdx-js+mdx@3.1.0_acorn@8.14.0/node_modules/@mdx-js/mdx/lib/util/estree-util-to-id-or-member-expression.js [app-rsc] (ecmascript)");
;
;
function recmaBuildJsxTransform(options) {
    /* c8 ignore next -- always given in `@mdx-js/mdx` */ const { outputFormat } = options || {};
    /**
   * @param {Program} tree
   *   Tree.
   * @returns {undefined}
   *   Nothing.
   */ return function(tree) {
        // Remove the pragma comment that we injected ourselves as it is no longer
        // needed.
        if (tree.comments) {
            tree.comments = tree.comments.filter(function(d) {
                return !d.data?._mdxIsPragmaComment;
            });
        }
        // When compiling to a function body, replace the import that was just
        // generated, and get `jsx`, `jsxs`, and `Fragment` from `arguments[0]`
        // instead.
        if (outputFormat === 'function-body') {
            let index = 0;
            // Skip directives: JS currently only has `use strict`, but Acorn allows
            // arbitrary ones.
            // Practically things like `use client` could be used?
            while(index < tree.body.length){
                const child = tree.body[index];
                if ('directive' in child && child.directive) {
                    index++;
                } else {
                    break;
                }
            }
            const declaration = tree.body[index];
            if (declaration && declaration.type === 'ImportDeclaration' && typeof declaration.source.value === 'string' && /\/jsx-(dev-)?runtime$/.test(declaration.source.value)) {
                tree.body[index] = {
                    type: 'VariableDeclaration',
                    kind: 'const',
                    declarations: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$mdx$2d$js$2b$mdx$40$3$2e$1$2e$0_acorn$40$8$2e$14$2e$0$2f$node_modules$2f40$mdx$2d$js$2f$mdx$2f$lib$2f$util$2f$estree$2d$util$2d$specifiers$2d$to$2d$declarations$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["specifiersToDeclarations"])(declaration.specifiers, (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$mdx$2d$js$2b$mdx$40$3$2e$1$2e$0_acorn$40$8$2e$14$2e$0$2f$node_modules$2f40$mdx$2d$js$2f$mdx$2f$lib$2f$util$2f$estree$2d$util$2d$to$2d$id$2d$or$2d$member$2d$expression$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["toIdOrMemberExpression"])([
                        'arguments',
                        0
                    ]))
                };
            }
        }
    };
}
}}),
"[project]/node_modules/.pnpm/@mdx-js+mdx@3.1.0_acorn@8.14.0/node_modules/@mdx-js/mdx/lib/core.js [app-rsc] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { r: __turbopack_require__, f: __turbopack_module_context__, i: __turbopack_import__, s: __turbopack_esm__, v: __turbopack_export_value__, n: __turbopack_export_namespace__, c: __turbopack_cache__, M: __turbopack_modules__, l: __turbopack_load__, j: __turbopack_dynamic__, P: __turbopack_resolve_absolute_path__, U: __turbopack_relative_url__, R: __turbopack_resolve_module_id_path__, b: __turbopack_worker_blob_url__, g: global, __dirname, x: __turbopack_external_require__, y: __turbopack_external_import__, z: __turbopack_require_stub__ } = __turbopack_context__;
{
/**
 * @import {Program} from 'estree-jsx'
 * @import {Root} from 'mdast'
 * @import {Options as RehypeRecmaOptions} from 'rehype-recma'
 * @import {Options as RemarkRehypeOptions} from 'remark-rehype'
 * @import {SourceMapGenerator} from 'source-map'
 * @import {PluggableList, Processor} from 'unified'
 */ /**
 * @typedef ProcessorOptions
 *   Configuration for `createProcessor`.
 * @property {typeof SourceMapGenerator | null | undefined} [SourceMapGenerator]
 *   Add a source map (object form) as the `map` field on the resulting file
 *   (optional).
 * @property {URL | string | null | undefined} [baseUrl]
 *   Use this URL as `import.meta.url` and resolve `import` and `export … from`
 *   relative to it (optional, example: `import.meta.url`).
 * @property {boolean | null | undefined} [development=false]
 *   Whether to add extra info to error messages in generated code and use the
 *   development automatic JSX runtime (`Fragment` and `jsxDEV` from
 *   `/jsx-dev-runtime`) (default: `false`);
 *   when using the webpack loader (`@mdx-js/loader`) or the Rollup integration
 *   (`@mdx-js/rollup`) through Vite, this is automatically inferred from how
 *   you configure those tools.
 * @property {RehypeRecmaOptions['elementAttributeNameCase']} [elementAttributeNameCase='react']
 *   Casing to use for attribute names (default: `'react'`);
 *   HTML casing is for example `class`, `stroke-linecap`, `xml:lang`;
 *   React casing is for example `className`, `strokeLinecap`, `xmlLang`;
 *   for JSX components written in MDX, the author has to be aware of which
 *   framework they use and write code accordingly;
 *   for AST nodes generated by this project, this option configures it
 * @property {'md' | 'mdx' | null | undefined} [format='mdx']
 *   format of the file (default: `'mdx'`);
 *   `'md'` means treat as markdown and `'mdx'` means treat as MDX.
 * @property {boolean | null | undefined} [jsx=false]
 *   Whether to keep JSX (default: `false`);
 *   the default is to compile JSX away so that the resulting file is
 *   immediately runnable.
 * @property {string | null | undefined} [jsxImportSource='react']
 *   Place to import automatic JSX runtimes from (default: `'react'`);
 *   when in the `automatic` runtime, this is used to define an import for
 *   `Fragment`, `jsx`, `jsxDEV`, and `jsxs`.
 * @property {'automatic' | 'classic' | null | undefined} [jsxRuntime='automatic']
 *   JSX runtime to use (default: `'automatic'`);
 *   the automatic runtime compiles to `import _jsx from
 *   '$importSource/jsx-runtime'\n_jsx('p')`;
 *   the classic runtime compiles to calls such as `h('p')`.
 *
 *   > 👉 **Note**: support for the classic runtime is deprecated and will
 *   > likely be removed in the next major version.
 * @property {ReadonlyArray<string> | null | undefined} [mdExtensions]
 *   List of markdown extensions, with dot (default: `['.md', '.markdown', …]`);
 *   affects integrations.
 * @property {ReadonlyArray<string> | null | undefined} [mdxExtensions]
 *   List of MDX extensions, with dot (default: `['.mdx']`);
 *   affects integrations.
 * @property {'function-body' | 'program' | null | undefined} [outputFormat='program']
 *   Output format to generate (default: `'program'`);
 *   in most cases `'program'` should be used, it results in a whole program;
 *   internally `evaluate` uses `'function-body'` to compile to
 *   code that can be passed to `run`;
 *   in some cases, you might want what `evaluate` does in separate steps, such
 *   as when compiling on the server and running on the client.
 * @property {string | null | undefined} [pragma='React.createElement']
 *   Pragma for JSX, used in the classic runtime as an identifier for function
 *   calls: `<x />` to `React.createElement('x')` (default:
 *   `'React.createElement'`);
 *   when changing this, you should also define `pragmaFrag` and
 *   `pragmaImportSource` too.
 *
 *   > 👉 **Note**: support for the classic runtime is deprecated and will
 *   > likely be removed in the next major version.
 * @property {string | null | undefined} [pragmaFrag='React.Fragment']
 *   Pragma for fragment symbol, used in the classic runtime as an identifier
 *   for unnamed calls: `<>` to `React.createElement(React.Fragment)` (default:
 *   `'React.Fragment'`);
 *   when changing this, you should also define `pragma` and
 *   `pragmaImportSource` too.
 *
 *   > 👉 **Note**: support for the classic runtime is deprecated and will
 *   > likely be removed in the next major version.
 * @property {string | null | undefined} [pragmaImportSource='react']
 *   Where to import the identifier of `pragma` from, used in the classic
 *   runtime (default: `'react'`);
 *   to illustrate, when `pragma` is `'a.b'` and `pragmaImportSource` is `'c'`
 *   the following will be generated: `import a from 'c'` and things such as
 *   `a.b('h1', {})`.
 *   when changing this, you should also define `pragma` and `pragmaFrag` too.
 *
 *   > 👉 **Note**: support for the classic runtime is deprecated and will
 *   > likely be removed in the next major version.
 * @property {string | null | undefined} [providerImportSource]
 *   Place to import a provider from (optional, example: `'@mdx-js/react'`);
 *   normally it’s used for runtimes that support context (React, Preact), but
 *   it can be used to inject components into the compiled code;
 *   the module must export and identifier `useMDXComponents` which is called
 *   without arguments to get an object of components (`MDXComponents` from
 *   `mdx/types.js`).
 * @property {PluggableList | null | undefined} [recmaPlugins]
 *   List of recma plugins (optional);
 *   this is a new ecosystem, currently in beta, to transform esast trees
 *   (JavaScript)
 * @property {PluggableList | null | undefined} [remarkPlugins]
 *   List of remark plugins (optional).
 * @property {PluggableList | null | undefined} [rehypePlugins]
 *   List of rehype plugins (optional).
 * @property {Readonly<RemarkRehypeOptions> | null | undefined} [remarkRehypeOptions]
 *   Options to pass through to `remark-rehype` (optional);
 *   the option `allowDangerousHtml` will always be set to `true` and the MDX
 *   nodes (see `nodeTypes`) are passed through;
 *   In particular, you might want to pass configuration for footnotes if your
 *   content is not in English.
 * @property {RehypeRecmaOptions['stylePropertyNameCase']} [stylePropertyNameCase='dom']
 *   Casing to use for property names in `style` objects (default: `'dom'`);
 *   CSS casing is for example `background-color` and `-webkit-line-clamp`;
 *   DOM casing is for example `backgroundColor` and `WebkitLineClamp`;
 *   for JSX components written in MDX, the author has to be aware of which
 *   framework they use and write code accordingly;
 *   for AST nodes generated by this project, this option configures it
 * @property {boolean | null | undefined} [tableCellAlignToStyle=true]
 *   Turn obsolete `align` properties on `td` and `th` into CSS `style`
 *   properties (default: `true`).
 */ __turbopack_esm__({
    "createProcessor": (()=>createProcessor)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$devlop$40$1$2e$1$2e$0$2f$node_modules$2f$devlop$2f$lib$2f$development$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/devlop@1.1.0/node_modules/devlop/lib/development.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$unified$40$11$2e$0$2e$5$2f$node_modules$2f$unified$2f$lib$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/unified@11.0.5/node_modules/unified/lib/index.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$remark$2d$parse$40$11$2e$0$2e$0$2f$node_modules$2f$remark$2d$parse$2f$lib$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/remark-parse@11.0.0/node_modules/remark-parse/lib/index.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$remark$2d$mdx$40$3$2e$1$2e$0$2f$node_modules$2f$remark$2d$mdx$2f$lib$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/remark-mdx@3.1.0/node_modules/remark-mdx/lib/index.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$mdx$2d$js$2b$mdx$40$3$2e$1$2e$0_acorn$40$8$2e$14$2e$0$2f$node_modules$2f40$mdx$2d$js$2f$mdx$2f$lib$2f$plugin$2f$remark$2d$mark$2d$and$2d$unravel$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/@mdx-js+mdx@3.1.0_acorn@8.14.0/node_modules/@mdx-js/mdx/lib/plugin/remark-mark-and-unravel.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$remark$2d$rehype$40$11$2e$1$2e$1$2f$node_modules$2f$remark$2d$rehype$2f$lib$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/remark-rehype@11.1.1/node_modules/remark-rehype/lib/index.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$mdx$2d$js$2b$mdx$40$3$2e$1$2e$0_acorn$40$8$2e$14$2e$0$2f$node_modules$2f40$mdx$2d$js$2f$mdx$2f$lib$2f$node$2d$types$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/@mdx-js+mdx@3.1.0_acorn@8.14.0/node_modules/@mdx-js/mdx/lib/node-types.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$mdx$2d$js$2b$mdx$40$3$2e$1$2e$0_acorn$40$8$2e$14$2e$0$2f$node_modules$2f40$mdx$2d$js$2f$mdx$2f$lib$2f$plugin$2f$rehype$2d$remove$2d$raw$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/@mdx-js+mdx@3.1.0_acorn@8.14.0/node_modules/@mdx-js/mdx/lib/plugin/rehype-remove-raw.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$rehype$2d$recma$40$1$2e$0$2e$0$2f$node_modules$2f$rehype$2d$recma$2f$lib$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/rehype-recma@1.0.0/node_modules/rehype-recma/lib/index.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$mdx$2d$js$2b$mdx$40$3$2e$1$2e$0_acorn$40$8$2e$14$2e$0$2f$node_modules$2f40$mdx$2d$js$2f$mdx$2f$lib$2f$plugin$2f$recma$2d$document$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/@mdx-js+mdx@3.1.0_acorn@8.14.0/node_modules/@mdx-js/mdx/lib/plugin/recma-document.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$mdx$2d$js$2b$mdx$40$3$2e$1$2e$0_acorn$40$8$2e$14$2e$0$2f$node_modules$2f40$mdx$2d$js$2f$mdx$2f$lib$2f$plugin$2f$recma$2d$jsx$2d$rewrite$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/@mdx-js+mdx@3.1.0_acorn@8.14.0/node_modules/@mdx-js/mdx/lib/plugin/recma-jsx-rewrite.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$recma$2d$build$2d$jsx$40$1$2e$0$2e$0$2f$node_modules$2f$recma$2d$build$2d$jsx$2f$lib$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/recma-build-jsx@1.0.0/node_modules/recma-build-jsx/lib/index.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$mdx$2d$js$2b$mdx$40$3$2e$1$2e$0_acorn$40$8$2e$14$2e$0$2f$node_modules$2f40$mdx$2d$js$2f$mdx$2f$lib$2f$plugin$2f$recma$2d$build$2d$jsx$2d$transform$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/@mdx-js+mdx@3.1.0_acorn@8.14.0/node_modules/@mdx-js/mdx/lib/plugin/recma-build-jsx-transform.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$recma$2d$jsx$40$1$2e$0$2e$0_acorn$40$8$2e$14$2e$0$2f$node_modules$2f$recma$2d$jsx$2f$lib$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/recma-jsx@1.0.0_acorn@8.14.0/node_modules/recma-jsx/lib/index.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$recma$2d$stringify$40$1$2e$0$2e$0$2f$node_modules$2f$recma$2d$stringify$2f$lib$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_import__("[project]/node_modules/.pnpm/recma-stringify@1.0.0/node_modules/recma-stringify/lib/index.js [app-rsc] (ecmascript)");
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
const removedOptions = [
    'compilers',
    'filepath',
    'hastPlugins',
    'mdPlugins',
    'skipExport',
    'wrapExport'
];
let warned = false;
function createProcessor(options) {
    const settings = options || {};
    let index = -1;
    while(++index < removedOptions.length){
        const key = removedOptions[index];
        if (key in settings) {
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$devlop$40$1$2e$1$2e$0$2f$node_modules$2f$devlop$2f$lib$2f$development$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["unreachable"])('Unexpected removed option `' + key + '`; see <https://mdxjs.com/migrating/v2/> on how to migrate');
        }
    }
    // @ts-expect-error: throw an error for a runtime value which is not allowed
    // by the types.
    if (settings.format === 'detect') {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$devlop$40$1$2e$1$2e$0$2f$node_modules$2f$devlop$2f$lib$2f$development$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["unreachable"])("Unexpected `format: 'detect'`, which is not supported by `createProcessor`, expected `'mdx'` or `'md'`");
    }
    if ((settings.jsxRuntime === 'classic' || settings.pragma || settings.pragmaFrag || settings.pragmaImportSource) && !warned) {
        warned = true;
        console.warn("Unexpected deprecated option `jsxRuntime: 'classic'`, `pragma`, `pragmaFrag`, or `pragmaImportSource`; see <https://mdxjs.com/migrating/v3/> on how to migrate");
    }
    const pipeline = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$unified$40$11$2e$0$2e$5$2f$node_modules$2f$unified$2f$lib$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["unified"])().use(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$remark$2d$parse$40$11$2e$0$2e$0$2f$node_modules$2f$remark$2d$parse$2f$lib$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"]);
    if (settings.format !== 'md') {
        pipeline.use(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$remark$2d$mdx$40$3$2e$1$2e$0$2f$node_modules$2f$remark$2d$mdx$2f$lib$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"]);
    }
    const remarkRehypeOptions = settings.remarkRehypeOptions || {};
    pipeline.use(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$mdx$2d$js$2b$mdx$40$3$2e$1$2e$0_acorn$40$8$2e$14$2e$0$2f$node_modules$2f40$mdx$2d$js$2f$mdx$2f$lib$2f$plugin$2f$remark$2d$mark$2d$and$2d$unravel$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["remarkMarkAndUnravel"]).use(settings.remarkPlugins || []).use(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$remark$2d$rehype$40$11$2e$1$2e$1$2f$node_modules$2f$remark$2d$rehype$2f$lib$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], {
        ...remarkRehypeOptions,
        allowDangerousHtml: true,
        passThrough: [
            ...remarkRehypeOptions.passThrough || [],
            ...__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$mdx$2d$js$2b$mdx$40$3$2e$1$2e$0_acorn$40$8$2e$14$2e$0$2f$node_modules$2f40$mdx$2d$js$2f$mdx$2f$lib$2f$node$2d$types$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["nodeTypes"]
        ]
    }).use(settings.rehypePlugins || []);
    if (settings.format === 'md') {
        pipeline.use(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$mdx$2d$js$2b$mdx$40$3$2e$1$2e$0_acorn$40$8$2e$14$2e$0$2f$node_modules$2f40$mdx$2d$js$2f$mdx$2f$lib$2f$plugin$2f$rehype$2d$remove$2d$raw$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["rehypeRemoveRaw"]);
    }
    pipeline// @ts-expect-error: `Program` is close enough to a `Node`,
    // but type inference has trouble with it and bridges.
    .use(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$rehype$2d$recma$40$1$2e$0$2e$0$2f$node_modules$2f$rehype$2d$recma$2f$lib$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], settings).use(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$mdx$2d$js$2b$mdx$40$3$2e$1$2e$0_acorn$40$8$2e$14$2e$0$2f$node_modules$2f40$mdx$2d$js$2f$mdx$2f$lib$2f$plugin$2f$recma$2d$document$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["recmaDocument"], settings).use(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$mdx$2d$js$2b$mdx$40$3$2e$1$2e$0_acorn$40$8$2e$14$2e$0$2f$node_modules$2f40$mdx$2d$js$2f$mdx$2f$lib$2f$plugin$2f$recma$2d$jsx$2d$rewrite$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["recmaJsxRewrite"], settings);
    if (!settings.jsx) {
        pipeline.use(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$recma$2d$build$2d$jsx$40$1$2e$0$2e$0$2f$node_modules$2f$recma$2d$build$2d$jsx$2f$lib$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], settings).use(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$mdx$2d$js$2b$mdx$40$3$2e$1$2e$0_acorn$40$8$2e$14$2e$0$2f$node_modules$2f40$mdx$2d$js$2f$mdx$2f$lib$2f$plugin$2f$recma$2d$build$2d$jsx$2d$transform$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["recmaBuildJsxTransform"], settings);
    }
    pipeline.use(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$recma$2d$jsx$40$1$2e$0$2e$0_acorn$40$8$2e$14$2e$0$2f$node_modules$2f$recma$2d$jsx$2f$lib$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"]).use(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$recma$2d$stringify$40$1$2e$0$2e$0$2f$node_modules$2f$recma$2d$stringify$2f$lib$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], settings).use(settings.recmaPlugins || []);
    // @ts-expect-error: TS doesn’t get the plugins we added with if-statements.
    return pipeline;
}
}}),

};

//# sourceMappingURL=1d74c_%40mdx-js_mdx_lib_7626af._.js.map