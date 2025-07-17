import { createToolBox } from "@gensx/core";
import { z } from "zod";

export const toolbox = createToolBox({
  moveMap: {
    description: "Move the map to a specific location",
    params: z.object({
      latitude: z.number().describe("Latitude coordinate to center the map on"),
      longitude: z
        .number()
        .describe("Longitude coordinate to center the map on"),
      zoom: z.number().optional().describe("Zoom level (1-20, default 12)"),
    }),
    result: z.object({
      success: z.boolean(),
      message: z.string(),
    }),
  },
  placeMarkers: {
    description: "Place markers on the map",
    params: z.object({
      markers: z.array(
        z.object({
          latitude: z.number().describe("Latitude coordinate for the marker"),
          longitude: z.number().describe("Longitude coordinate for the marker"),
          title: z.string().optional().describe("Title for the marker popup"),
          description: z
            .string()
            .optional()
            .describe("Description for the marker popup"),
          color: z
            .string()
            .optional()
            .describe("Marker color (red, blue, green, yellow, purple)"),
        }),
      ),
    }),
    result: z.object({
      success: z.boolean(),
      message: z.string(),
    }),
  },
  removeMarker: {
    description: "Remove a marker from the map",
    params: z.object({
      markerId: z.string().describe("ID of the marker to remove"),
    }),
    result: z.object({
      success: z.boolean(),
      message: z.string(),
    }),
  },
  clearMarkers: {
    description: "Clear all markers from the map",
    params: z.object({}),
    result: z.object({
      success: z.boolean(),
      message: z.string(),
    }),
  },
  getCurrentView: {
    description: "Get the current view of the map",
    params: z.object({}),
    result: z.object({
      latitude: z.number(),
      longitude: z.number(),
      zoom: z.number(),
    }),
  },
  listMarkers: {
    description: "List all markers on the map",
    params: z.object({}),
    result: z.union([
      z.array(
        z.object({
          id: z.string(),
          latitude: z.number(),
          longitude: z.number(),
        }),
      ),
      z.object({
        success: z.boolean(),
        message: z.string(),
      }),
    ]),
  },
  getUserLocation: {
    description: "Get the user's current location using browser geolocation",
    params: z.object({
      enableHighAccuracy: z
        .boolean()
        .optional()
        .describe("Enable high accuracy mode (default: false)"),
      timeout: z
        .number()
        .optional()
        .describe("Timeout in milliseconds (default: 10000)"),
      maximumAge: z
        .number()
        .optional()
        .describe(
          "Maximum age of cached position in milliseconds (default: 60000)",
        ),
    }),
    result: z.union([
      z.object({
        success: z.boolean(),
        latitude: z.number(),
        longitude: z.number(),
        accuracy: z.number().optional(),
        message: z.string(),
      }),
      z.object({
        success: z.boolean(),
        message: z.string(),
      }),
    ]),
  },
});
