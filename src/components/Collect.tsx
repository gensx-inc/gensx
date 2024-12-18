import { executeJsxWorkflow } from "../workflow/execute";

export function Collect(props: {
  children: string[] | Promise<string>[];
}): Promise<string> {
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
  });
}
