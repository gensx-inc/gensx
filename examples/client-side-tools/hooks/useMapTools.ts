import { useState, useRef, useCallback, useEffect } from "react";
import L from "leaflet";
import { getMapState, updateMapState } from "@/lib/actions/map-state";

// OSRM API interfaces
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

export interface MapView {
  latitude: number;
  longitude: number;
  zoom: number;
}

export interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  title?: string;
  description?: string;
  color?: string;
  photoUrl?: string;
}

export interface Waypoint {
  lat: number;
  lon: number;
  label?: string;
}

export interface RouteData {
  id: string;
  geometry: GeoJSON.LineString;
  startLat: number;
  startLon: number;
  endLat: number;
  endLon: number;
  startLabel?: string;
  endLabel?: string;
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
          });
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
        photoUrl?: string;
      }[];
    }) => {
      markers.forEach((marker) => {
        const markerId = `marker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newMarker: MapMarker = {
          id: markerId,
          ...marker,
        };

        setMarkers((prev) => [...prev, newMarker]);
      });

      return {
        success: true,
        message: `Markers placed`,
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
      startLat: number;
      startLon: number;
      endLat: number;
      endLon: number;
      startLabel?: string;
      endLabel?: string;
      waypoints?: Waypoint[];
      profile?: "driving-car" | "foot-walking" | "cycling-regular";
    }) => {
      const {
        startLat,
        startLon,
        endLat,
        endLon,
        startLabel,
        endLabel,
        waypoints = [],
        profile = "driving-car",
      } = params;

      try {
        // Map profile to OSRM profile
        let osrmProfile = "driving";
        if (profile === "foot-walking") {
          osrmProfile = "foot";
        } else if (profile === "cycling-regular") {
          osrmProfile = "cycling";
        }

        // Build coordinates string for OSRM API (start, waypoints, end)
        let coordinates = `${startLon},${startLat}`;

        // Add waypoints if provided
        if (waypoints && waypoints.length > 0) {
          for (const waypoint of waypoints) {
            coordinates += `;${waypoint.lon},${waypoint.lat}`;
          }
        }

        coordinates += `;${endLon},${endLat}`;

        // Call OSRM API for routing
        const url = `https://router.project-osrm.org/route/v1/${osrmProfile}/${coordinates}?overview=full&geometries=geojson&steps=true`;

        const response = await fetch(url, {
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          return {
            success: false as const,
            message: `Error calculating route: ${response.statusText}`,
          };
        }

        const routeData: OSRMResponse = await response.json();

        if (!routeData.routes || routeData.routes.length === 0) {
          return {
            success: false as const,
            message: "No route found between the specified points",
          };
        }

        const route = routeData.routes[0];
        const legs = route.legs || [];

        // Extract turn-by-turn directions from steps
        const directions = legs.flatMap(
          (leg: OSRMLeg) =>
            leg.steps?.map((step: OSRMStep) => ({
              instruction: step.maneuver?.instruction || "Continue",
              distance: step.distance || 0,
              duration: step.duration || 0,
              type: getManeuverType(step.maneuver?.type),
              name: step.name || "",
            })) || [],
        );

        const routeInfo: RouteData = {
          id: `route-${Date.now()}`,
          geometry: route.geometry ?? {
            type: "LineString",
            coordinates: [],
          },
          startLat: startLat,
          startLon: startLon,
          endLat: endLat,
          endLon: endLon,
          startLabel: startLabel,
          endLabel: endLabel,
          waypoints: waypoints,
          profile: params.profile ?? "driving-car",
          directions: directions,
          distance: route.distance ?? 0,
          duration: route.duration ?? 0,
          distanceText: formatDistance(route.distance ?? 0),
          durationText: formatDuration(route.duration ?? 0),
        };

        setRoute(routeInfo);

        // Fit map to route bounds
        if (route.geometry && route.geometry.coordinates) {
          const coordinates = route.geometry.coordinates;
          if (coordinates.length > 0) {
            // Calculate rough center and zoom to fit the route
            const lats = coordinates.map((coord: number[]) => coord[1]);
            const lngs = coordinates.map((coord: number[]) => coord[0]);

            const minLat = Math.min(...lats);
            const maxLat = Math.max(...lats);
            const minLng = Math.min(...lngs);
            const maxLng = Math.max(...lngs);

            const centerLat = (minLat + maxLat) / 2;
            const centerLng = (minLng + maxLng) / 2;

            setCurrentView({
              latitude: centerLat,
              longitude: centerLng,
              zoom: 13,
            });
          }
        }

        return {
          success: true as const,
          message: "Route calculated and displayed on map",
          route: {
            geometry: route.geometry ?? {
              type: "LineString",
              coordinates: [],
            },
            distance: route.distance ?? 0,
            duration: route.duration ?? 0,
            distanceText: formatDistance(route.distance ?? 0),
            durationText: formatDuration(route.duration ?? 0),
            directions: directions,
          },
        };
      } catch (error) {
        return {
          success: false as const,
          message: `Failed to calculate route: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    },
    [],
  );

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
