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
      "Place markers on the map. Do your very best to include a photo of the place (such as the interior or a menu for a restaurant, or a scenic photo of a landmark). Ensure that any photos are real URLs that were retrieved from the web search tool.",
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
          photoUrl: z
            .string()
            .optional()
            .describe(
              "Photo URL to display as the marker icon. Be sure this is a real URL that is accessible to the user.",
            ),
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
  calculateAndShowRoute: {
    description:
      "Calculate a route with multiple stops and display it on the map with turn-by-turn directions. You must provide coordinates for start and end points. Optionally include waypoints between them and labels for better display.",
    params: z.object({
      startLat: z.number().describe("Starting point latitude"),
      startLon: z.number().describe("Starting point longitude"),
      endLat: z.number().describe("Ending point latitude"),
      endLon: z.number().describe("Ending point longitude"),
      startLabel: z
        .string()
        .optional()
        .describe(
          "Optional label/address for the starting point (for display purposes)",
        ),
      endLabel: z
        .string()
        .optional()
        .describe(
          "Optional label/address for the ending point (for display purposes)",
        ),
      waypoints: z
        .array(
          z.object({
            lat: z.number().describe("Waypoint latitude"),
            lon: z.number().describe("Waypoint longitude"),
            label: z
              .string()
              .optional()
              .describe("Optional label for the waypoint"),
          }),
        )
        .optional()
        .describe("Optional intermediate stops between start and end points"),
      profile: z
        .enum(["driving-car", "foot-walking", "cycling-regular"])
        .optional()
        .default("driving-car")
        .describe(
          "Transportation mode: driving-car, foot-walking, or cycling-regular",
        ),
    }),
    result: z.union([
      z.object({
        success: z.literal(true),
        message: z.string(),
        route: z.object({
          geometry: z.object({
            type: z.literal("LineString"),
            coordinates: z.array(z.array(z.number())),
          }),
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
