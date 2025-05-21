import { Component } from "@gensx/core";
import * as ai from "ai";

export const streamObject = Component({ name: "streamObject" })(
  ai.streamObject,
) as typeof ai.streamObject;

export const streamText = Component({ name: "streamText" })(
  ai.streamText,
) as typeof ai.streamText;

export const generateText = Component({ name: "generateText" })(
  ai.generateText,
) as typeof ai.generateText;

export const generateObject = Component({ name: "generateObject" })(
  ai.generateObject,
) as typeof ai.generateObject;

export const embed = Component({ name: "embed" })(ai.embed) as typeof ai.embed;

export const embedMany = Component({ name: "embedMany" })(
  ai.embedMany,
) as typeof ai.embedMany;

export const generateImage = Component({ name: "generateImage" })(
  ai.experimental_generateImage,
) as typeof ai.experimental_generateImage;
