import { z } from "zod";
import { tool } from "ai";

// Helper function to calculate distance between two points using Haversine formula
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

const findBoundingBoxSchema = z.object({
  center: z.object({
    latitude: z.number().describe("Center point latitude"),
    longitude: z.number().describe("Center point longitude"),
  }),
  radius: z.number().describe("Radius in meters from the center point"),
});

export const findBoundingBoxTool = tool({
  description:
    "Calculate a bounding box around a center point with a given radius in meters",
  parameters: findBoundingBoxSchema,
  execute: async (params: z.infer<typeof findBoundingBoxSchema>) => {
    const { center, radius } = params;

    try {
      // Calculate the angular radius in degrees
      const angularRadius = radius / ((6371e3 * Math.PI) / 180);

      const boundingBox = {
        north: center.latitude + angularRadius,
        south: center.latitude - angularRadius,
        east:
          center.longitude +
          angularRadius / Math.cos((center.latitude * Math.PI) / 180),
        west:
          center.longitude -
          angularRadius / Math.cos((center.latitude * Math.PI) / 180),
      };

      return JSON.stringify(
        {
          success: true,
          boundingBox,
          center,
          radius,
        },
        null,
        2,
      );
    } catch {
      return JSON.stringify(
        {
          success: false,
          boundingBox: { north: 0, south: 0, east: 0, west: 0 },
          center,
          radius,
        },
        null,
        2,
      );
    }
  },
});

const createBoundingBoxSchema = z.object({
  points: z.array(
    z.object({
      latitude: z.number().describe("Point latitude"),
      longitude: z.number().describe("Point longitude"),
    }),
  ),
  padding: z
    .number()
    .optional()
    .describe("Padding in meters around the points"),
});

export const createBoundingBoxTool = tool({
  description: "Create a bounding box around a list of points",
  parameters: createBoundingBoxSchema,
  execute: async (params: z.infer<typeof createBoundingBoxSchema>) => {
    const { points, padding } = params;

    try {
      if (points.length === 0) {
        return JSON.stringify(
          {
            success: false,
            error: "No points provided",
            boundingBox: { north: 0, south: 0, east: 0, west: 0 },
          },
          null,
          2,
        );
      }

      // Find the min/max coordinates
      let minLat = points[0].latitude;
      let maxLat = points[0].latitude;
      let minLon = points[0].longitude;
      let maxLon = points[0].longitude;

      for (const point of points) {
        minLat = Math.min(minLat, point.latitude);
        maxLat = Math.max(maxLat, point.latitude);
        minLon = Math.min(minLon, point.longitude);
        maxLon = Math.max(maxLon, point.longitude);
      }

      // Apply padding if specified
      let paddingDegrees = 0;
      if (padding && padding > 0) {
        // Convert meters to degrees (approximate)
        paddingDegrees = padding / 111000; // Rough conversion: 1 degree ≈ 111km
      }

      const boundingBox = {
        north: maxLat + paddingDegrees,
        south: minLat - paddingDegrees,
        east: maxLon + paddingDegrees,
        west: minLon - paddingDegrees,
      };

      return JSON.stringify(
        {
          success: true,
          boundingBox,
          points,
          padding: padding || 0,
          paddingDegrees,
        },
        null,
        2,
      );
    } catch (error) {
      return JSON.stringify(
        {
          success: false,
          error: `Failed to create bounding box: ${error instanceof Error ? error.message : "Unknown error"}`,
          boundingBox: { north: 0, south: 0, east: 0, west: 0 },
          points,
          padding: padding || 0,
        },
        null,
        2,
      );
    }
  },
});

const findClosestSchema = z.object({
  start: z.object({
    latitude: z.number().describe("Starting point latitude"),
    longitude: z.number().describe("Starting point longitude"),
  }),
  points: z
    .array(
      z.object({
        latitude: z.number().describe("Point latitude"),
        longitude: z.number().describe("Point longitude"),
        id: z.string().optional().describe("Optional identifier for the point"),
        title: z.string().optional().describe("Optional title for the point"),
      }),
    )
    .describe("Array of points to search through"),
});

export const findClosestTool = tool({
  description:
    "Find the closest point from a start location among a list of points",
  parameters: findClosestSchema,
  execute: async (params: z.infer<typeof findClosestSchema>) => {
    const { start, points } = params;

    try {
      const distances = points.map((point) => ({
        ...point,
        distance: calculateDistance(
          start.latitude,
          start.longitude,
          point.latitude,
          point.longitude,
        ),
      }));

      distances.sort((a, b) => a.distance - b.distance);
      const closest = distances[0];

      return JSON.stringify(
        {
          success: true,
          closest,
          allDistances: distances,
        },
        null,
        2,
      );
    } catch {
      return JSON.stringify(
        {
          success: false,
          closest: { latitude: 0, longitude: 0, distance: 0 },
          allDistances: [],
        },
        null,
        2,
      );
    }
  },
});

const calculateDistanceSchema = z.object({
  point1: z.object({
    latitude: z.number().describe("First point latitude"),
    longitude: z.number().describe("First point longitude"),
  }),
  point2: z.object({
    latitude: z.number().describe("Second point latitude"),
    longitude: z.number().describe("Second point longitude"),
  }),
});

export const calculateDistanceTool = tool({
  description:
    "Calculate the distance between two points using the Haversine formula",
  parameters: calculateDistanceSchema,
  execute: async (params: z.infer<typeof calculateDistanceSchema>) => {
    const { point1, point2 } = params;

    try {
      const distance = calculateDistance(
        point1.latitude,
        point1.longitude,
        point2.latitude,
        point2.longitude,
      );

      return JSON.stringify(
        {
          success: true,
          distance,
          distanceKm: distance / 1000,
          distanceMiles: distance / 1609.344,
        },
        null,
        2,
      );
    } catch {
      return JSON.stringify(
        {
          success: false,
          distance: 0,
          distanceKm: 0,
          distanceMiles: 0,
        },
        null,
        2,
      );
    }
  },
});

const isPointInBoundingBoxSchema = z.object({
  point: z.object({
    latitude: z.number().describe("Point latitude to check"),
    longitude: z.number().describe("Point longitude to check"),
  }),
  boundingBox: z.object({
    north: z.number().describe("Northern boundary latitude"),
    south: z.number().describe("Southern boundary latitude"),
    east: z.number().describe("Eastern boundary longitude"),
    west: z.number().describe("Western boundary longitude"),
  }),
});

export const isPointInBoundingBoxTool = tool({
  description: "Check if a point is within a bounding box",
  parameters: isPointInBoundingBoxSchema,
  execute: async (params: z.infer<typeof isPointInBoundingBoxSchema>) => {
    const { point, boundingBox } = params;

    try {
      const isInside =
        point.latitude <= boundingBox.north &&
        point.latitude >= boundingBox.south &&
        point.longitude <= boundingBox.east &&
        point.longitude >= boundingBox.west;

      return JSON.stringify(
        {
          success: true,
          isInside,
          point,
          boundingBox,
        },
        null,
        2,
      );
    } catch {
      return JSON.stringify(
        {
          success: false,
          isInside: false,
          point,
          boundingBox,
        },
        null,
        2,
      );
    }
  },
});

const sortPointsByDistanceSchema = z.object({
  reference: z.object({
    latitude: z.number().describe("Reference point latitude"),
    longitude: z.number().describe("Reference point longitude"),
  }),
  points: z
    .array(
      z.object({
        latitude: z.number().describe("Point latitude"),
        longitude: z.number().describe("Point longitude"),
        id: z.string().optional().describe("Optional identifier for the point"),
        title: z.string().optional().describe("Optional title for the point"),
      }),
    )
    .describe("Array of points to sort"),
});

export const sortPointsByDistanceTool = tool({
  description: "Sort a list of points by their distance from a reference point",
  parameters: sortPointsByDistanceSchema,
  execute: async (params: z.infer<typeof sortPointsByDistanceSchema>) => {
    const { reference, points } = params;

    try {
      const sortedPoints = points.map((point) => ({
        ...point,
        distance: calculateDistance(
          reference.latitude,
          reference.longitude,
          point.latitude,
          point.longitude,
        ),
      }));

      sortedPoints.sort((a, b) => a.distance - b.distance);

      return JSON.stringify(
        {
          success: true,
          reference,
          sortedPoints,
        },
        null,
        2,
      );
    } catch {
      return JSON.stringify(
        {
          success: false,
          reference,
          sortedPoints: [],
        },
        null,
        2,
      );
    }
  },
});
