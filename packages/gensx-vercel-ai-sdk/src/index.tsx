import * as ai from "ai";
import { gsx } from "gensx";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createGSXComponent<TFn extends (...args: any[]) => any>(
  name: string,
  fn: TFn,
) {
  return gsx.Component<Parameters<TFn>[0], Awaited<ReturnType<TFn>>>(name, fn);
}

type GSXComponent<T, R> = ReturnType<typeof gsx.Component<T, R>>;

export const StreamObject: GSXComponent<
  Parameters<typeof ai.streamObject>[0],
  Awaited<ReturnType<typeof ai.streamObject>>
> = createGSXComponent("StreamObject", ai.streamObject);
export const StreamText: GSXComponent<
  Parameters<typeof ai.streamText>[0],
  Awaited<ReturnType<typeof ai.streamText>>
> = createGSXComponent("StreamText", ai.streamText);
export const GenerateText: GSXComponent<
  Parameters<typeof ai.generateText>[0],
  Awaited<ReturnType<typeof ai.generateText>>
> = createGSXComponent("GenerateText", ai.generateText);
export const GenerateObject: GSXComponent<
  Parameters<typeof ai.generateObject>[0],
  Awaited<ReturnType<typeof ai.generateObject>>
> = createGSXComponent("GenerateObject", ai.generateObject);
export const Embed: GSXComponent<
  Parameters<typeof ai.embed>[0],
  Awaited<ReturnType<typeof ai.embed>>
> = createGSXComponent("Embed", ai.embed);
export const EmbedMany: GSXComponent<
  Parameters<typeof ai.embedMany>[0],
  Awaited<ReturnType<typeof ai.embedMany>>
> = createGSXComponent("EmbedMany", ai.embedMany);
export const GenerateImage: GSXComponent<
  Parameters<typeof ai.experimental_generateImage>[0],
  Awaited<ReturnType<typeof ai.experimental_generateImage>>
> = createGSXComponent("GenerateImage", ai.experimental_generateImage);
