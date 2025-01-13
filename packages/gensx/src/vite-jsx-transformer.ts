import { Plugin } from "vite";
import { getCustomTransformers } from "./transformer";
import ts from "typescript";

export function jsxTransformerPlugin(): Plugin {
  return {
    name: "jsx-transformer",
    enforce: "pre",
    transform(code: string, id: string) {
      if (!id.endsWith(".tsx") && !id.endsWith(".jsx")) {
        return null;
      }

      const result = ts.transpileModule(code, {
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ESNext,
          jsx: ts.JsxEmit.ReactJSX,
          jsxImportSource: "gensx",
          sourceMap: true,
        },
        fileName: id,
        transformers: getCustomTransformers(),
      });

      return {
        code: result.outputText,
        map: result.sourceMapText ? JSON.parse(result.sourceMapText) : null,
      };
    },
  } satisfies Plugin;
}
