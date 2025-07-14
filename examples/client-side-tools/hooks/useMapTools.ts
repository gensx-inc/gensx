import { useState, useRef, useCallback, useEffect } from "react";
import L from "leaflet";

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
}

export function useMapTools(userId: string | null, threadId: string | null) {
  const mapRef = useRef<L.Map | null>(null);
  const [currentView, setCurrentView] = useState<MapView>({
    latitude: 40.7128,
    longitude: -74.006,
    zoom: 12,
  });
  const [markers, setMarkers] = useState<MapMarker[]>([]);

  useEffect(() => {
    if (!userId || !threadId) {
      setMarkers([]);
      setCurrentView({
        latitude: 40.7128,
        longitude: -74.006,
        zoom: 12,
      });
      return;
    }

    const fetchMapState = async () => {
      const response = await fetch(`/api/map-state/${userId}/${threadId}`);
      if (response.status === 404) {
        setMarkers([]);
        setCurrentView({
          latitude: 40.7128,
          longitude: -74.006,
          zoom: 12,
        });
        return;
      }
      const data = await response.json();
      console.log("fetchMapState", response.status, data);
      setCurrentView({
        latitude: data.latitude,
        longitude: data.longitude,
        zoom: data.zoom,
      });
      setMarkers(data.markers ?? []);
    };
    fetchMapState();
  }, [userId, threadId]);

  // Keep the persisted map state in sync with the current view
  useEffect(() => {
    if (!userId || !threadId) return;

    const updateMapState = async () => {
      await fetch(`/api/map-state/${userId}/${threadId}`, {
        method: "POST",
        body: JSON.stringify({
          ...currentView,
          markers,
        }),
      });
    };

    updateMapState();
  }, [currentView, markers, userId, threadId]);

  // Simple tool implementations for map control
  const moveMap = useCallback(
    (latitude: number, longitude: number, zoom = 12) => {
      try {
        console.log("moveMap", latitude, longitude, zoom);
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
      console.log("placeMarkers", markers);

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
    console.log("listMarkers", markers);
    return markers;
  }, [markers]);

  const getCurrentView = useCallback(() => {
    console.log("getCurrentView", currentView);
    return currentView;
  }, [currentView]);

  const removeMarker = useCallback((id: string) => {
    console.log("removeMarker", id);
    setMarkers((prev) => prev.filter((marker) => marker.id !== id));
    return { success: true, message: `Marker ${id} removed` };
  }, []);

  const clearMarkers = useCallback(() => {
    console.log("clearMarkers");
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
