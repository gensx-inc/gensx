import * as ai from "ai";
import { gsx, type GsxComponent } from "gensx";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createGSXComponent<TFn extends (...args: any[]) => any>(
  name: string,
  fn: TFn,
) {
  return gsx.Component<Parameters<TFn>[0], Awaited<ReturnType<TFn>>>(name, fn);
}

export const StreamObject: GsxComponent<
  Parameters<typeof ai.streamObject>[0],
  Awaited<ReturnType<typeof ai.streamObject>>
> = createGSXComponent("StreamObject", ai.streamObject);
export const StreamText: GsxComponent<
  Parameters<typeof ai.streamText>[0],
  Awaited<ReturnType<typeof ai.streamText>>
> = createGSXComponent("StreamText", ai.streamText);
export const GenerateText: GsxComponent<
  Parameters<typeof ai.generateText>[0],
  Awaited<ReturnType<typeof ai.generateText>>
> = createGSXComponent("GenerateText", ai.generateText);
export const GenerateObject: GsxComponent<
  Parameters<typeof ai.generateObject>[0],
  Awaited<ReturnType<typeof ai.generateObject>>
> = createGSXComponent("GenerateObject", ai.generateObject);
export const Embed: GsxComponent<
  Parameters<typeof ai.embed>[0],
  Awaited<ReturnType<typeof ai.embed>>
> = createGSXComponent("Embed", ai.embed);
export const EmbedMany: GsxComponent<
  Parameters<typeof ai.embedMany>[0],
  Awaited<ReturnType<typeof ai.embedMany>>
> = createGSXComponent("EmbedMany", ai.embedMany);
export const GenerateImage: GsxComponent<
  Parameters<typeof ai.experimental_generateImage>[0],
  Awaited<ReturnType<typeof ai.experimental_generateImage>>
> = createGSXComponent("GenerateImage", ai.experimental_generateImage);
