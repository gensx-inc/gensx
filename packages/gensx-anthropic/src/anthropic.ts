import {
  Anthropic as OriginalAnthropic,
  ClientOptions,
} from "@anthropic-ai/sdk";
import { wrap } from "@gensx/core";

export class Anthropic extends OriginalAnthropic {
  constructor(options: ClientOptions) {
    super(options);
    return wrapAnthropic(this);
  }
}

// TODO: Deeper wrapping
export const wrapAnthropic = wrap;
