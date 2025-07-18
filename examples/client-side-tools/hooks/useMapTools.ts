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
        }
      } catch (error) {
        console.error("Error fetching map state:", error);
        setMarkers([]);
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
        });
      } catch (error) {
        console.error("Error updating map state:", error);
      }
    };

    updateMapStateData();
  }, [currentView, markers, userId, threadId, isLoaded]);

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

  return {
    mapRef,
    currentView,
    markers,
    removeMarker,
    clearMarkers,
    moveMap,
    placeMarkers,
    getCurrentView,
    listMarkers,
  };
}
