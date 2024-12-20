import { JSX } from "./jsx-runtime";

export async function gensx<TOutput>(node: JSX.Element): Promise<TOutput> {
  return (await node) as TOutput;
}
