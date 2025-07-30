import { useState, useRef, useCallback, useEffect } from "react";
import type L from "leaflet";
import { getMapState, updateMapState } from "@/lib/actions/map-state";

// Mapbox Directions API interfaces
interface MapboxManeuver {
  instruction?: string;
  type?: string;
  bearing_before?: number;
  bearing_after?: number;
  location?: [number, number];
}

interface MapboxStep {
  distance?: number;
  duration?: number;
  geometry?: GeoJSON.LineString;
  name?: string;
  maneuver?: MapboxManeuver;
  mode?: string;
  ref?: string;
}

interface MapboxLeg {
  distance?: number;
  duration?: number;
  steps?: MapboxStep[];
  summary?: string;
}

interface MapboxRoute {
  distance?: number;
  duration?: number;
  geometry?: GeoJSON.LineString;
  legs?: MapboxLeg[];
  weight_name?: string;
  weight?: number;
}

interface MapboxDirectionsResponse {
  code: string;
  routes?: MapboxRoute[];
  waypoints?: Array<{
    hint?: string;
    distance?: number;
    name?: string;
    location?: [number, number];
  }>;
}

// Utility functions for formatting
const formatDistance = (meters: number): string => {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  } else {
    return `${(meters / 1000).toFixed(1)} km`;
  }
};

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
};

const getManeuverType = (osrmType: string | undefined): number => {
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
};

export type MapView =
  | {
      latitude?: never;
      longitude?: never;
      zoom?: never;
      fitBounds: L.LatLngBoundsExpression;
    }
  | {
      latitude: number;
      longitude: number;
      zoom: number;
      fitBounds?: never;
    };

export interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  title?: string;
  description?: string;
  color?: string;
}

export type Waypoint = Omit<MapMarker, "id">;

export interface RouteData {
  id: string;
  geometry: GeoJSON.LineString;
  start: MapMarker;
  end: MapMarker;
  waypoints?: Waypoint[];
  profile: string;
  directions: Array<{
    instruction: string;
    distance: number;
    duration: number;
    type?: number;
    name?: string;
  }>;
  distance: number;
  duration: number;
  distanceText: string;
  durationText: string;
  // Add support for multiple routes
  alternativeRoutes?: Array<{
    profile: string;
    geometry: GeoJSON.LineString;
    distance: number;
    duration: number;
    distanceText: string;
    durationText: string;
    directions: Array<{
      instruction: string;
      distance: number;
      duration: number;
      type?: number;
      name?: string;
    }>;
  }>;
}

const getDefaultLocation = async (): Promise<MapView> => {
  const fallbackView = {
    latitude: 37.7749, // San Francisco
    longitude: -122.4194,
    zoom: 12,
  };

  if (!navigator.geolocation) {
    return fallbackView;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          zoom: 12,
        });
      },
      () => {
        // If geolocation fails, use San Francisco
        resolve(fallbackView);
      },
      {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 300000, // 5 minutes
      },
    );
  });
};

export function useMapTools(userId: string | null, threadId: string | null) {
  const mapRef = useRef<L.Map | null>(null);
  const [currentView, setCurrentView] = useState<MapView>({
    latitude: 37.7749, // San Francisco fallback
    longitude: -122.4194,
    zoom: 12,
  });
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [route, setRoute] = useState<RouteData | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(false); // Reset loading state when userId or threadId changes

    if (!userId || !threadId) {
      setMarkers([]);
      // Get user's location for new threads
      getDefaultLocation().then((location) => {
        setCurrentView(location);
        setIsLoaded(true);
      });
      return;
    }

    const fetchMapState = async () => {
      try {
        const data = await getMapState(userId, threadId);
        if (!data) {
          setMarkers([]);
          setRoute(null);
          // Get user's location for new threads
          const location = await getDefaultLocation();
          setCurrentView(location);
        } else {
          setCurrentView({
            latitude: data.latitude,
            longitude: data.longitude,
            zoom: data.zoom,
            fitBounds: data.fitBounds,
          } as MapView);
          setMarkers(data.markers ?? []);
          setRoute(data.route ?? null);
        }
      } catch (error) {
        console.error("Error fetching map state:", error);
        setMarkers([]);
        setRoute(null);
        // Get user's location on error
        const location = await getDefaultLocation();
        setCurrentView(location);
      } finally {
        setIsLoaded(true);
      }
    };
    fetchMapState();
  }, [userId, threadId]);

  // Keep the persisted map state in sync with the current view
  useEffect(() => {
    if (!userId || !threadId || !isLoaded) return;

    const updateMapStateData = async () => {
      try {
        await updateMapState(userId, threadId, {
          ...currentView,
          markers,
          route,
        });
      } catch (error) {
        console.error("Error updating map state:", error);
      }
    };

    updateMapStateData();
  }, [currentView, markers, route, userId, threadId, isLoaded]);

  // Simple tool implementations for map control
  const moveMap = useCallback(
    (latitude: number, longitude: number, zoom = 12) => {
      try {
        setCurrentView({ latitude, longitude, zoom });
        return {
          success: true,
          message: `Map moved to ${latitude}, ${longitude} at zoom level ${zoom}`,
        };
      } catch (error) {
        return { success: false, message: `Failed to move map: ${error}` };
      }
    },
    [],
  );

  const placeMarkers = useCallback(
    ({
      markers,
    }: {
      markers: {
        latitude: number;
        longitude: number;
        title?: string;
        description?: string;
        color?: string;
      }[];
    }) => {
      const newMarkers: MapMarker[] = [];

      markers.forEach((marker) => {
        const markerId = `marker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newMarker: MapMarker = {
          id: markerId,
          ...marker,
        };
        newMarkers.push(newMarker);
      });

      setMarkers((prev) => [...prev, ...newMarkers]);

      // Automatically navigate map to show the new markers
      if (newMarkers.length === 1) {
        // For a single marker, center on it with appropriate zoom
        const marker = newMarkers[0];
        setCurrentView({
          latitude: marker.latitude,
          longitude: marker.longitude,
          zoom: 15, // Good zoom level to see the marker clearly
        });
      } else if (newMarkers.length > 1) {
        // For multiple markers, fit bounds to show all of them
        const lats = newMarkers.map((m) => m.latitude);
        const lngs = newMarkers.map((m) => m.longitude);

        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);

        // Add some padding around the bounds
        const latPadding = (maxLat - minLat) * 0.1;
        const lngPadding = (maxLng - minLng) * 0.1;

        setCurrentView({
          fitBounds: [
            [minLat - latPadding, minLng - lngPadding],
            [maxLat + latPadding, maxLng + lngPadding],
          ] as const,
        });
      }

      return {
        success: true,
        message: `Markers placed and map navigated to show them`,
      };
    },
    [],
  );

  const listMarkers = useCallback(() => {
    return markers;
  }, [markers]);

  const getCurrentView = useCallback(() => {
    const center = mapRef.current?.getCenter();
    const zoom = mapRef.current?.getZoom();
    return {
      latitude: center?.lat ?? currentView.latitude,
      longitude: center?.lng ?? currentView.longitude,
      zoom: zoom ?? currentView.zoom,
    };
  }, [currentView]);

  const removeMarker = useCallback((id: string) => {
    setMarkers((prev) => prev.filter((marker) => marker.id !== id));
    return { success: true, message: `Marker ${id} removed` };
  }, []);

  const clearMarkers = useCallback(() => {
    setMarkers([]);
    return { success: true, message: "All markers cleared" };
  }, []);

  const getUserLocation = useCallback(() => {
    return new Promise<{
      success: boolean;
      latitude?: number;
      longitude?: number;
      accuracy?: number;
      message: string;
    }>((resolve) => {
      if (!navigator.geolocation) {
        resolve({
          success: false,
          message: "Geolocation is not supported by this browser.",
        });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            success: true,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            message: "Location obtained successfully",
          });
        },
        (error) => {
          resolve({
            success: false,
            message: `Error getting location: ${error.message}`,
          });
        },
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 60000,
        },
      );
    });
  }, []);

  const calculateAndShowRoute = useCallback(
    async (params: {
      start: Omit<MapMarker, "id">;
      end: Omit<MapMarker, "id">;
      waypoints?: Waypoint[];
      profile?: "driving" | "walking" | "cycling";
    }) => {
      const { start, end, waypoints = [], profile = "driving" } = params;

      try {
        // Build coordinates string for Mapbox API (start, waypoints, end)
        let coordinates = `${start.longitude},${start.latitude}`;

        // Add waypoints if provided
        if (waypoints && waypoints.length > 0) {
          for (const waypoint of waypoints) {
            coordinates += `;${waypoint.longitude},${waypoint.latitude}`;
          }
        }

        coordinates += `;${end.longitude},${end.latitude}`;

        // Get Mapbox access token
        const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
        if (!mapboxToken) {
          console.error("Mapbox access token not configured");
          return {
            success: false as const,
            message: "Mapbox access token not configured",
          };
        }

        console.log("Calculating routes for coordinates:", coordinates);

        // Calculate primary route
        const primaryRoute = await calculateSingleRoute(
          coordinates,
          profile,
          mapboxToken,
        );

        if (!primaryRoute.success) {
          return {
            success: false as const,
            message: primaryRoute.message || "Failed to calculate route",
          };
        }

        // Calculate alternative routes for comparison
        const alternativeProfiles = ["driving", "walking"].filter(
          (p) => p !== profile,
        );
        const alternativeRoutes = [];

        for (const altProfile of alternativeProfiles) {
          const altRoute = await calculateSingleRoute(
            coordinates,
            altProfile as "driving" | "walking" | "cycling",
            mapboxToken,
          );
          if (altRoute.success && altRoute.routeInfo) {
            alternativeRoutes.push({
              profile: altProfile,
              geometry: altRoute.routeInfo.geometry,
              distance: altRoute.routeInfo.distance,
              duration: altRoute.routeInfo.duration,
              distanceText: formatDistance(altRoute.routeInfo.distance),
              durationText: formatDuration(altRoute.routeInfo.duration),
              directions: altRoute.routeInfo.directions,
            });
          }
        }

        const routeInfo: RouteData = {
          ...primaryRoute.routeInfo!,
          start: {
            ...start,
            id: `route-start-${Date.now()}`,
          },
          end: {
            ...end,
            id: `route-end-${Date.now()}`,
          },
          waypoints,
          alternativeRoutes,
        };

        console.log("Setting route data:", {
          id: routeInfo.id,
          geometryCoords: routeInfo.geometry.coordinates?.length,
          distance: routeInfo.distance,
          duration: routeInfo.duration,
          alternativeRoutes: routeInfo.alternativeRoutes?.length,
        });

        setRoute(routeInfo);

        // Fit map to route bounds
        if (
          routeInfo.geometry &&
          routeInfo.geometry.coordinates &&
          routeInfo.geometry.coordinates.length > 0
        ) {
          const coordinates = routeInfo.geometry.coordinates;
          console.log(
            "Fitting map to route with",
            coordinates.length,
            "coordinate points",
          );

          // Calculate rough center and zoom to fit the route
          const lats = coordinates.map((coord: number[]) => coord[1]);
          const lngs = coordinates.map((coord: number[]) => coord[0]);

          const minLat = Math.min(...lats);
          const maxLat = Math.max(...lats);
          const minLng = Math.min(...lngs);
          const maxLng = Math.max(...lngs);

          setCurrentView({
            fitBounds: [
              [minLat, minLng],
              [maxLat, maxLng],
            ] as const,
          });
        }

        const result = {
          success: true as const,
          message: "Route calculated and displayed on map",
          route: {
            distance: routeInfo.distance,
            duration: routeInfo.duration,
            distanceText: routeInfo.distanceText,
            durationText: routeInfo.durationText,
            directions: routeInfo.directions,
            alternativeRoutes: routeInfo.alternativeRoutes?.map((alt) => ({
              profile: alt.profile,
              distance: alt.distance,
              duration: alt.duration,
              distanceText: alt.distanceText,
              durationText: alt.durationText,
            })),
          },
        };
        return result;
      } catch (error) {
        console.error("Route calculation error:", error);
        return {
          success: false as const,
          message: `Failed to calculate route: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    },
    [],
  );

  // Helper function to calculate a single route
  const calculateSingleRoute = async (
    coordinates: string,
    profile: "driving" | "walking" | "cycling",
    mapboxToken: string,
  ): Promise<{
    success: boolean;
    message?: string;
    routeInfo?: Omit<
      RouteData,
      "start" | "end" | "waypoints" | "alternativeRoutes"
    >;
  }> => {
    try {
      // Call Mapbox Directions API for routing
      const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordinates}?access_token=${mapboxToken}&overview=full&geometries=geojson&steps=true`;

      console.log(
        `Fetching ${profile} route from:`,
        url.replace(mapboxToken, "TOKEN"),
      );

      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        console.error(
          `Error calculating ${profile} route:`,
          response.statusText,
        );
        return {
          success: false,
          message: `Error calculating ${profile} route: ${response.statusText}`,
        };
      }

      const routeData: MapboxDirectionsResponse = await response.json();
      console.log(`${profile} route response:`, {
        code: routeData.code,
        routesCount: routeData.routes?.length,
        firstRouteDistance: routeData.routes?.[0]?.distance,
        firstRouteDuration: routeData.routes?.[0]?.duration,
        firstRouteGeometry:
          routeData.routes?.[0]?.geometry?.coordinates?.length,
      });

      if (!routeData.routes || routeData.routes.length === 0) {
        console.error(`No ${profile} route found between the specified points`);
        return {
          success: false,
          message: `No ${profile} route found between the specified points`,
        };
      }

      const route = routeData.routes[0];
      const legs = route.legs || [];

      // Extract turn-by-turn directions from steps
      const directions = legs.flatMap(
        (leg: MapboxLeg) =>
          leg.steps?.map((step: MapboxStep) => ({
            instruction: step.maneuver?.instruction || "Continue",
            distance: step.distance || 0,
            duration: step.duration || 0,
            type: getManeuverType(step.maneuver?.type),
            name: step.name || "",
          })) || [],
      );

      // Ensure geometry exists and has coordinates
      if (
        !route.geometry ||
        !route.geometry.coordinates ||
        route.geometry.coordinates.length === 0
      ) {
        console.error(`No geometry found for ${profile} route`);
        return {
          success: false,
          message: `No geometry found for ${profile} route`,
        };
      }

      const routeInfo = {
        id: `route-${profile}-${Date.now()}`,
        geometry: route.geometry,
        profile,
        directions,
        distance: route.distance ?? 0,
        duration: route.duration ?? 0,
        distanceText: formatDistance(route.distance ?? 0),
        durationText: formatDuration(route.duration ?? 0),
      };

      return {
        success: true,
        routeInfo,
      };
    } catch (error) {
      console.error(`Error calculating ${profile} route:`, error);
      return {
        success: false,
        message: `Failed to calculate ${profile} route: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  };

  const clearDirections = useCallback(() => {
    setRoute(null);
    return { success: true, message: "Directions cleared from map" };
  }, []);

  return {
    mapRef,
    currentView,
    markers,
    route,
    removeMarker,
    clearMarkers,
    moveMap,
    placeMarkers,
    getCurrentView,
    listMarkers,
    getUserLocation,
    calculateAndShowRoute,
    clearDirections,
  };
}
