import { useState, useRef, useCallback, useEffect } from "react";
import L from "leaflet";
import { getMapState, updateMapState } from "@/lib/actions/map-state";

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

export interface RouteData {
  id: string;
  geometry: GeoJSON.LineString;
  startLat: number;
  startLon: number;
  endLat: number;
  endLon: number;
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
    return new Promise<{ success: boolean; latitude?: number; longitude?: number; accuracy?: number; message: string }>((resolve) => {
      if (!navigator.geolocation) {
        resolve({ success: false, message: "Geolocation is not supported by this browser." });
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
          resolve({ success: false, message: `Error getting location: ${error.message}` });
        },
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 60000,
        }
      );
    });
  }, []);

  const showDirections = useCallback((params: {
    startLat: number;
    startLon: number;
    endLat: number;
    endLon: number;
    profile?: "driving-car" | "foot-walking" | "cycling-regular";
    geometry?: GeoJSON.LineString;
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
  }) => {
    try {
      const routeData: RouteData = {
        id: `route-${Date.now()}`,
        geometry: params.geometry ?? {
          type: "LineString",
          coordinates: [],
        },
        startLat: params.startLat,
        startLon: params.startLon,
        endLat: params.endLat,
        endLon: params.endLon,
        profile: params.profile ?? "driving-car",
        directions: params.directions,
        distance: params.distance,
        duration: params.duration,
        distanceText: params.distanceText,
        durationText: params.durationText,
      };

      setRoute(routeData);

      // Fit map to route bounds
      if (params.geometry && params.geometry.coordinates) {
        const coordinates = params.geometry.coordinates;
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
            zoom: 13
          });
        }
      }

      return { success: true, message: "Directions displayed on map" };
    } catch (error) {
      return { success: false, message: `Failed to show directions: ${error}` };
    }
  }, []);

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
    showDirections,
    clearDirections,
  };
}
