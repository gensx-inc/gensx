/* eslint-disable @typescript-eslint/no-unsafe-call */

import { createComponent } from "@gensx/core";
import * as ai from "ai";

export const streamObject = createComponent(ai.streamObject, {
  name: "streamObject",
}) as unknown as typeof ai.streamObject;

export const streamText = createComponent(ai.streamText, {
  name: "streamText",
}) as unknown as typeof ai.streamText;

export const generateText = createComponent(ai.generateText, {
  name: "generateText",
}) as unknown as typeof ai.generateText;

export const generateObject = createComponent(ai.generateObject, {
  name: "generateObject",
}) as unknown as typeof ai.generateObject;

export const embed = createComponent(ai.embed, {
  name: "embed",
}) as unknown as typeof ai.embed;

export const embedMany = createComponent(ai.embedMany, {
  name: "embedMany",
}) as unknown as typeof ai.embedMany;

export const generateImage = createComponent(ai.experimental_generateImage, {
  name: "generateImage",
}) as unknown as typeof ai.experimental_generateImage;
