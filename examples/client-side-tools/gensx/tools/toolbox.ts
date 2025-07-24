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
    description:
      "Place markers on the map with detailed titles and descriptions.",
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
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      zoom: z.number().optional(),
      fitBounds: z.array(z.array(z.number())).optional(),
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
  calculateAndShowRoute: {
    description:
      "Calculate a route with multiple stops and display it on the map with turn-by-turn directions. You must provide coordinates for start and end points. Optionally include waypoints between them and labels for better display.",
    params: z.object({
      start: z.object({
        latitude: z.number().describe("Starting point latitude"),
        longitude: z.number().describe("Starting point longitude"),
        title: z.string().optional().describe("Starting point title"),
        description: z
          .string()
          .optional()
          .describe("Starting point description"),
        color: z.string().optional().describe("Starting point color"),
        photoUrl: z.string().optional().describe("Starting point photo URL"),
      }),
      end: z.object({
        latitude: z.number().describe("Ending point latitude"),
        longitude: z.number().describe("Ending point longitude"),
        title: z.string().optional().describe("Ending point title"),
        description: z.string().optional().describe("Ending point description"),
        color: z.string().optional().describe("Ending point color"),
        photoUrl: z.string().optional().describe("Ending point photo URL"),
      }),
      waypoints: z
        .array(
          z.object({
            latitude: z.number().describe("Waypoint latitude"),
            longitude: z.number().describe("Waypoint longitude"),
            title: z.string().optional().describe("Title for the waypoint"),
            description: z
              .string()
              .optional()
              .describe("Description for the waypoint"),
            color: z.string().optional().describe("Waypoint color"),
            photoUrl: z.string().optional().describe("Waypoint photo URL"),
          }),
        )
        .optional()
        .describe("Optional intermediate stops between start and end points"),
      profile: z
        .enum(["driving", "walking", "cycling"])
        .optional()
        .default("driving")
        .describe(
          "Transportation mode: driving-car, foot-walking, or cycling-regular",
        ),
    }),
    result: z.union([
      z.object({
        success: z.literal(true),
        message: z.string(),
        route: z.object({
          distance: z.number().describe("Distance in meters"),
          duration: z.number().describe("Duration in seconds"),
          distanceText: z.string(),
          durationText: z.string(),
          directions: z.array(
            z.object({
              instruction: z.string(),
              distance: z.number(),
              duration: z.number(),
              type: z.number().optional(),
              name: z.string().optional(),
            }),
          ),
        }),
      }),
      z.object({
        success: z.literal(false),
        message: z.string(),
      }),
    ]),
  },
  clearDirections: {
    description: "Clear any displayed route from the map",
    params: z.object({}),
    result: z.object({
      success: z.boolean(),
      message: z.string(),
    }),
  },
});
