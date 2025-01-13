import { createJsxNameTransformer } from "./jsx-name-transformer";

export function getCustomTransformers() {
  return {
    before: [createJsxNameTransformer()],
    afterDeclarations: [],
  };
}
