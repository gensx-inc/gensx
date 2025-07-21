import { z } from "zod";
import { tool } from "ai";
import { pRateLimit } from "p-ratelimit";
import { useBlob } from "@gensx/storage";
import crypto from "crypto";

// Types
interface RoutingResult {
  success: boolean;
  geometry?: GeoJSON.LineString;
  distance?: number;
  duration?: number;
  profile?: string;
  directions?: Array<{
    instruction: string;
    distance: number;
    duration: number;
    type?: number;
    name?: string;
  }>;
  distanceText?: string;
  durationText?: string;
  error?: string;
}

interface OSRMManeuver {
  instruction?: string;
  type?: string;
  bearing_before?: number;
  bearing_after?: number;
  location?: [number, number];
}

interface OSRMStep {
  distance?: number;
  duration?: number;
  geometry?: GeoJSON.LineString;
  name?: string;
  maneuver?: OSRMManeuver;
  mode?: string;
  ref?: string;
}

interface OSRMLeg {
  distance?: number;
  duration?: number;
  steps?: OSRMStep[];
  summary?: string;
}

interface OSRMRoute {
  distance?: number;
  duration?: number;
  geometry?: GeoJSON.LineString;
  legs?: OSRMLeg[];
  weight_name?: string;
  weight?: number;
}

interface OSRMResponse {
  code: string;
  routes?: OSRMRoute[];
  waypoints?: Array<{
    hint?: string;
    distance?: number;
    name?: string;
    location?: [number, number];
  }>;
}

// Rate limit for routing API calls
const limit = pRateLimit({
  interval: 1000, // 1000 ms == 1 second
  rate: 2, // 2 API calls per interval
  concurrency: 2, // no more than 2 running at once
  maxDelay: 30000, // an API call delayed > 30 sec is rejected
});

const routingSchema = z.object({
  startLat: z.number().describe("Starting point latitude"),
  startLon: z.number().describe("Starting point longitude"),
  endLat: z.number().describe("Ending point latitude"),
  endLon: z.number().describe("Ending point longitude"),
  profile: z
    .enum(["driving-car", "foot-walking", "cycling-regular"])
    .optional()
    .default("driving-car")
    .describe("Transportation mode: driving-car, foot-walking, or cycling-regular"),
});

export const routingTool = tool({
  description:
    "Calculate a route between two points and get turn-by-turn directions. Returns route geometry, distance, duration, and directions.",
  parameters: routingSchema,
  execute: async (params: z.infer<typeof routingSchema>) => {
    const { startLat, startLon, endLat, endLon, profile } = params;

    // Create cache key based on parameters
    const hashParams = crypto
      .createHash("sha256")
      .update(`${startLat},${startLon},${endLat},${endLon},${profile}`)
      .digest("hex");

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const routeBlob = useBlob<RoutingResult>(
      `route-cache/${hashParams}.json`,
    );

    const cachedRoute = await routeBlob.getJSON();
    if (cachedRoute) {
      return cachedRoute;
    }

    const data = await limit(async () => {
      try {
        // Map profile to OSRM profile
        let osrmProfile = "driving";
        if (profile === "foot-walking") {
          osrmProfile = "foot";
        } else if (profile === "cycling-regular") {
          osrmProfile = "cycling";
        }

        // Using OSRM Demo Server for routing (free, no API key required)
        // Note: This is a demo server with limited reliability and rate limits
        const url = `https://router.project-osrm.org/route/v1/${osrmProfile}/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson&steps=true`;

        const response = await fetch(url, {
          headers: {
            "Accept": "application/json",
          },
        });

        if (!response.ok) {
          return {
            success: false,
            error: `Error calculating route: ${response.statusText}`,
          };
        }

        const routeData: OSRMResponse = await response.json();

        if (!routeData.routes || routeData.routes.length === 0) {
          return {
            success: false,
            error: "No route found between the specified points",
          };
        }

        const route = routeData.routes[0];
        const legs = route.legs || [];

        // Extract turn-by-turn directions from steps
        const directions = legs.flatMap((leg: OSRMLeg) =>
          leg.steps?.map((step: OSRMStep) => ({
            instruction: step.maneuver?.instruction || "Continue",
            distance: step.distance || 0,
            duration: step.duration || 0,
            type: getManeuverType(step.maneuver?.type),
            name: step.name || "",
          })) || []
        );

        const result: RoutingResult = {
          success: true,
          geometry: route.geometry,
          distance: route.distance, // in meters
          duration: route.duration, // in seconds
          profile: profile,
          directions: directions,
          distanceText: route.distance ? formatDistance(route.distance) : undefined,
          durationText: route.duration ? formatDuration(route.duration) : undefined,
        };

        await routeBlob.putJSON(result);
        return result;

      } catch (error) {
        return {
          success: false,
          error: `Error calculating route: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    });

    return data;
  },
});

function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  } else {
    return `${(meters / 1000).toFixed(1)} km`;
  }
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

function getManeuverType(osrmType: string | undefined): number {
  // Map OSRM maneuver types to simple numeric types for the UI
  switch (osrmType) {
    case "depart":
    case "arrive":
      return 0; // Start/end
    case "turn":
      return 3; // Turn
    case "continue":
    case "merge":
      return 1; // Continue
    case "on ramp":
    case "off ramp":
      return 2; // Ramp
    case "fork":
      return 2; // Fork
    case "roundabout":
    case "rotary":
      return 4; // Roundabout
    default:
      return 1; // Default to continue
  }
}
