import { ComponentChild } from "preact";

interface Component {
  type: (
    props: Record<string, unknown>,
  ) => ComponentChild | Promise<ComponentChild>;
  props: {
    children?: unknown;
    [key: string]: unknown;
  };
}

function isComponent(node: unknown): node is Component {
  return (
    typeof node === "object" &&
    node !== null &&
    "type" in node &&
    typeof (node as Component).type === "function"
  );
}

type RenderPropChild<T> = (
  value: T,
) => ComponentChild | Promise<ComponentChild>;

async function resolveNode(
  node: ComponentChild | Promise<ComponentChild>,
): Promise<unknown> {
  if (typeof node !== "object" || node === null) {
    return node;
  }

  const resolvedNode = await node;

  if (!isComponent(resolvedNode)) {
    return resolvedNode;
  }

  // Handle render props first
  if (typeof resolvedNode.props.children === "function") {
    const renderProp = resolvedNode.props.children as RenderPropChild<unknown>;
    const { children, ...props } = resolvedNode.props;
    const result = await resolvedNode.type(props);
    const resolvedResult = await resolveNode(result);
    return resolveNode(renderProp(resolvedResult));
  }

  // Otherwise just execute the component
  const result = await resolvedNode.type(resolvedNode.props);
  return resolveNode(result);
}

export async function executeJsxWorkflow<T = unknown>(
  node: ComponentChild,
): Promise<T> {
  const result = await resolveNode(node);
  if (result === undefined || result === null || typeof result === "boolean") {
    throw new Error("Workflow result is null, undefined, or boolean");
  }
  return result as T;
}
