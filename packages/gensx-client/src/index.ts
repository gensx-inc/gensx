/**
 * GenSX SDK - TypeScript SDK for GenSX workflow interactions
 *
 * This SDK provides a clean interface for interacting with GenSX workflows,
 * including both streaming and async execution patterns.
 */

// Main SDK export
export { GenSX } from "./sdk";

// Type exports
export type {
  GenSXConfig,
  RunOptions,
  RunRawOptions,
  StartOptions,
  StartResponse,
  GetProgressOptions,
  GenSXEvent,
  GenSXStartEvent,
  GenSXComponentStartEvent,
  GenSXComponentEndEvent,
  GenSXProgressEvent,
  GenSXOutputEvent,
  GenSXEndEvent,
  GenSXErrorEvent,
} from "./sdk";

// Default export
export { GenSX as default } from "./sdk";
