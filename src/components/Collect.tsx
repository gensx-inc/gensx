import { MaybePromise } from "../jsx-runtime";
import { executeJsxWorkflow } from "../workflow/execute";

export function Collect<TOutput>(props: {
  children: MaybePromise<TOutput>[];
}): Promise<TOutput> {
  const promise = Promise.all(
    props.children.map(child =>
      child instanceof Promise
        ? child
        : executeJsxWorkflow(Promise.resolve(child)),
    ),
  );
  return Promise.resolve(promise).then(result => {
    console.log("Collect result", result);
    return result.join("\n");
  }) as Promise<TOutput>;
}
