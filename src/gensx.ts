import { JSX } from "./jsx-runtime";

export async function execute<TOutput>(node: JSX.Element): Promise<TOutput> {
  return (await node) as TOutput;
}
