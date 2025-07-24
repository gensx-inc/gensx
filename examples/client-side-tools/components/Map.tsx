"use client";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Tooltip,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-markercluster";
import { useRef, useEffect, useMemo, useState } from "react";

import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";
import { MapMarker, MapView, RouteData } from "@/hooks/useMapTools";
import L from "leaflet";

// Create cluster icon with count
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createClusterIcon = (cluster: any) => {
  const count = Math.max(0, Math.floor(cluster.getChildCount())); // Ensure count is a positive integer

  // Different sizes and colors based on count
  let size = 40;
  let bgColor = "#3B82F6";

  if (count >= 10) {
    size = 50;
    bgColor = "#EF4444"; // Red for large clusters
  } else if (count >= 5) {
    size = 45;
    bgColor = "#F59E0B"; // Orange for medium clusters
  }

  // Clamp size to reasonable bounds
  size = Math.max(30, Math.min(60, size));
  const scale = size / 32; // Scale based on original 32px size
  const fontSize = size > 45 ? 14 : 12;

  const clusterIcon = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <g transform="scale(${scale})">
        <path d="M16 2C11.589 2 8 5.589 8 10c0 7.5 8 18 8 18s8-10.5 8-18c0-4.411-3.589-8-8-8z" fill="${bgColor}" stroke="#ffffff" stroke-width="2"/>
      </g>
      <text x="${size / 2}" y="${size / 2 - 4}" text-anchor="middle" dominant-baseline="middle" fill="white" font-family="Arial, sans-serif" font-size="${fontSize}px" font-weight="bold">${count}</text>
    </svg>
  `;

  return L.divIcon({
    html: clusterIcon,
    className: "custom-cluster-marker",
    iconSize: [size, size],
    iconAnchor: [size / 2, size - 4],
    popupAnchor: [0, -(size - 4)],
  });
};

interface MapProps {
  ref?: React.RefObject<L.Map | null>;
  markers?: MapMarker[];
  view?: MapView;
  route?: RouteData | null;
}

const defaultView: MapView = {
  zoom: 12,
  latitude: 37.7749, // San Francisco
  longitude: -122.4194,
};

// Basic color sanitization
const sanitizeColor = (color: string): string => {
  // Only allow valid hex colors and some basic named colors
  const validColorPattern = /^#[0-9A-Fa-f]{6}$|^#[0-9A-Fa-f]{3}$/;
  const namedColors = [
    "red",
    "blue",
    "green",
    "yellow",
    "orange",
    "purple",
    "pink",
    "gray",
  ];

  if (
    validColorPattern.test(color) ||
    namedColors.includes(color.toLowerCase())
  ) {
    return color;
  }

  return "#3B82F6"; // Default blue
};

// Basic HTML escaping
const escapeHtml = (unsafe: string): string => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const createMarkerIcon = (
  color: string = "#3B82F6",
  isNew: boolean = false,
  title?: string,
) => {
  const sanitizedColor = sanitizeColor(color);
  const animationClass = isNew ? " new-marker" : "";
  const displayTitle = title ? escapeHtml(title) : "";

  const svgIcon = `
    <div class="marker-with-label">
      <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 2C11.589 2 8 5.589 8 10c0 7.5 8 18 8 18s8-10.5 8-18c0-4.411-3.589-8-8-8z" fill="${sanitizedColor}" stroke="#ffffff" stroke-width="2"/>
        <circle cx="16" cy="10" r="3" fill="#ffffff"/>
      </svg>
      ${displayTitle ? `<div class="marker-label">${displayTitle}</div>` : ""}
    </div>
  `;

  return L.divIcon({
    html: svgIcon,
    className: `custom-marker${animationClass}`,
    iconSize: [120, displayTitle ? 55 : 32],
    iconAnchor: [60, displayTitle ? 55 : 32],
    popupAnchor: [0, displayTitle ? -55 : -32],
  });
};

interface MarkerPopupProps {
  marker: MapMarker;
}

const MarkerPopup = ({ marker }: MarkerPopupProps) => {
  return (
    <div className="max-w-xs">
      {marker.title && <h3 className="font-semibold mb-2">{marker.title}</h3>}
      {marker.description && (
        <p className="text-sm text-gray-600 mb-2">{marker.description}</p>
      )}
    </div>
  );
};

const MapMarkerComponent = ({
  marker,
  isNew,
  ref,
  originalPositionRef,
}: {
  marker: MapMarker;
  isNew: boolean;
  ref: React.RefObject<L.Map | null>;
  originalPositionRef: React.RefObject<{
    center: L.LatLng;
    zoom: number;
  } | null>;
}) => {
  return (
    <Marker
      key={marker.id}
      position={[marker.latitude, marker.longitude]}
      draggable={false}
      icon={createMarkerIcon(marker.color, isNew, marker.title)}
      eventHandlers={{
        click: (e) => {
          if (ref?.current) {
            originalPositionRef.current = {
              center: ref.current.getCenter(),
              zoom: ref.current.getZoom(),
            };
          }
          // Prevent event from bubbling to map
          e.originalEvent?.stopPropagation();
        },
      }}
    >
      <Popup
        closeOnEscapeKey={false}
        closeOnClick={false}
        eventHandlers={{
          remove: () => {
            if (originalPositionRef.current) {
              // Capture the original position to avoid race condition
              const originalPosition = originalPositionRef.current;
              originalPositionRef.current = null;

              setTimeout(() => {
                if (ref?.current && originalPosition) {
                  ref.current.setView(
                    originalPosition.center,
                    originalPosition.zoom,
                  );
                }
              }, 100);
            }
          },
        }}
      >
        <MarkerPopup marker={marker} />
      </Popup>
    </Marker>
  );
};

const Map = (props: MapProps) => {
  const { ref, markers, view = defaultView, route } = props;
  const originalPositionRef = useRef<{ center: L.LatLng; zoom: number } | null>(
    null,
  );
  const previousMarkersRef = useRef<Set<string>>(new Set());
  const newMarkersRef = useRef<Set<string>>(new Set());
  const [lastCenterAndZoom, setLastCenterAndZoom] = useState<{
    latitude: number;
    longitude: number;
    zoom: number;
  } | null>(null);

  useEffect(() => {
    if (!view) {
      return;
    }
    if (!view.fitBounds) {
      if (
        lastCenterAndZoom?.latitude !== view.latitude ||
        lastCenterAndZoom?.longitude !== view.longitude ||
        lastCenterAndZoom?.zoom !== view.zoom
      ) {
        setLastCenterAndZoom({
          latitude: view.latitude,
          longitude: view.longitude,
          zoom: view.zoom,
        });
      }
    }
    if (ref?.current) {
      // in some hot reload cases, the map will not have the center and zoom set. So we need to set it manually if an error is thrown, then flyToBounds.
      if (view.fitBounds) {
        try {
          ref.current.flyToBounds(view.fitBounds);
        } catch (error) {
          if (
            error instanceof Error &&
            error.message.includes("Set map center and zoom first.")
          ) {
            const { latitude, longitude, zoom } = lastCenterAndZoom ?? {
              // sf
              latitude: 37.7749,
              longitude: -122.4194,
              zoom: 12,
            };
            ref.current.setView([latitude, longitude], zoom);
            ref.current.flyToBounds(view.fitBounds);
          }
        }
      } else {
        ref.current.setView([view.latitude, view.longitude], view.zoom);
      }
    }
  }, [view, ref, lastCenterAndZoom]);

  // Track newly added markers
  useEffect(() => {
    if (!markers) return;

    const currentMarkerIds = new Set(markers.map((m) => m.id));
    const previousMarkerIds = previousMarkersRef.current;

    // Find new markers (those in current but not in previous)
    const newMarkerIds = new Set<string>();
    for (const id of currentMarkerIds) {
      if (!previousMarkerIds.has(id)) {
        newMarkerIds.add(id);
      }
    }

    // Update refs
    newMarkersRef.current = newMarkerIds;
    previousMarkersRef.current = currentMarkerIds;

    // Clear new marker animations after animation duration
    if (newMarkerIds.size > 0) {
      setTimeout(() => {
        newMarkersRef.current.clear();
      }, 1400); // Duration of both animations combined
    }
  }, [markers]);

  // Memoize markers with clustering to prevent flickering during streaming
  const memoizedMarkers = useMemo(() => {
    if (!markers) return [];

    return markers.map((item) => {
      // Render single marker
      const marker = item as MapMarker;
      const isNew = newMarkersRef.current.has(marker.id);

      return (
        <MapMarkerComponent
          key={marker.id}
          marker={marker}
          isNew={isNew}
          ref={ref as React.RefObject<L.Map | null>}
          originalPositionRef={originalPositionRef}
        />
      );
    });
  }, [markers, ref]);

  // Memoize route polyline
  const memoizedRoute = useMemo(() => {
    if (!route || !route.geometry || !route.geometry.coordinates) {
      console.log("No route data available for rendering");
      return null;
    }

    console.log("Rendering route with geometry:", {
      routeId: route.id,
      coordinatesLength: route.geometry.coordinates.length,
      profile: route.profile,
      alternativeRoutes: route.alternativeRoutes?.length || 0,
    });

    // Convert GeoJSON coordinates to Leaflet format [lat, lng]
    const positions = route.geometry.coordinates
      .filter((coord: number[]) => coord.length >= 2)
      .map((coord: number[]): [number, number] => [coord[1], coord[0]]);

    console.log("Primary route positions:", {
      totalPositions: positions.length,
      firstPosition: positions[0],
      lastPosition: positions[positions.length - 1],
    });

    const getRouteColor = (profile: string) => {
      switch (profile) {
        case "driving":
          return "#3B82F6";
        case "walking":
          return "#10B981";
        case "cycling":
          return "#F59E0B";
        default:
          return "#6B7280";
      }
    };

    // Create combined label with both driving and walking times
    const getCombinedLabel = () => {
      const drivingRoute =
        route.profile === "driving"
          ? route
          : route.alternativeRoutes?.find((r) => r.profile === "driving");
      const walkingRoute =
        route.profile === "walking"
          ? route
          : route.alternativeRoutes?.find((r) => r.profile === "walking");

      const parts = [];
      if (drivingRoute) {
        parts.push(`🚗 ${drivingRoute.durationText}`);
      }
      if (walkingRoute) {
        parts.push(`🚶 ${walkingRoute.durationText}`);
      }

      return parts.join(" • ");
    };

    const routes = [
      // Primary route with combined label
      <Polyline
        key={`${route.id}-primary`}
        positions={positions}
        pathOptions={{
          color: getRouteColor(route.profile),
          weight: 6,
          opacity: 0.9,
          dashArray: undefined,
        }}
      >
        <Tooltip permanent direction="center" className="route-tooltip">
          <div className="flex items-center gap-1 text-sm font-semibold">
            <span>{getCombinedLabel()}</span>
          </div>
        </Tooltip>
      </Polyline>,
    ];

    // Add alternative routes without labels (since the label is now combined on the primary route)
    if (route.alternativeRoutes && route.alternativeRoutes.length > 0) {
      route.alternativeRoutes.forEach((altRoute, index) => {
        if (altRoute.geometry && altRoute.geometry.coordinates) {
          const altPositions = altRoute.geometry.coordinates
            .filter((coord: number[]) => coord.length >= 2)
            .map((coord: number[]): [number, number] => [coord[1], coord[0]]);

          console.log(`Alternative route ${altRoute.profile}:`, {
            totalPositions: altPositions.length,
            profile: altRoute.profile,
          });

          routes.push(
            <Polyline
              key={`${route.id}-alt-${index}`}
              positions={altPositions}
              pathOptions={{
                color: getRouteColor(altRoute.profile),
                weight: 4,
                opacity: 0.6,
                dashArray: "10,5",
              }}
            />,
          );
        }
      });
    }

    return <>{routes}</>;
  }, [route]);

  // Create start, waypoint, and end markers for the route
  const routeMarkers = useMemo(() => {
    if (!route) return [];

    const routeMarkerComponents = [];

    // Helper function to check if a marker already exists at a position
    const hasExistingMarker = (
      lat: number,
      lng: number,
      tolerance = 0.0001,
    ) => {
      return (
        markers?.some(
          (marker) =>
            Math.abs(marker.latitude - lat) < tolerance &&
            Math.abs(marker.longitude - lng) < tolerance,
        ) || false
      );
    };

    // Only add start marker if no existing marker is close to the start position
    if (!hasExistingMarker(route.start.latitude, route.start.longitude)) {
      routeMarkerComponents.push(
        <MapMarkerComponent
          key={`${route.id}-start`}
          marker={{
            ...route.start,
            title: route.start.title || "Starting Point",
            description: route.start.description || "Route starting point",
            color: "#22C55E",
          }}
          isNew={false}
          ref={ref as React.RefObject<L.Map | null>}
          originalPositionRef={originalPositionRef}
        />,
      );
    }

    // Only add end marker if no existing marker is close to the end position
    if (!hasExistingMarker(route.end.latitude, route.end.longitude)) {
      routeMarkerComponents.push(
        <MapMarkerComponent
          key={`${route.id}-end`}
          marker={{
            ...route.end,
            title: route.end.title || "Destination",
            description: route.end.description || "Route destination",
            color: "#EF4444",
          }}
          isNew={false}
          ref={ref as React.RefObject<L.Map | null>}
          originalPositionRef={originalPositionRef}
        />,
      );
    }

    // Add waypoint markers (only if they don't overlap with existing markers)
    if (route.waypoints && route.waypoints.length > 0) {
      route.waypoints.forEach((waypoint, index) => {
        if (!hasExistingMarker(waypoint.latitude, waypoint.longitude)) {
          routeMarkerComponents.push(
            <MapMarkerComponent
              key={`${route.id}-waypoint-${index}`}
              marker={{
                ...waypoint,
                id: `${route.id}-waypoint-${index}`,
                title: waypoint.title || `Waypoint ${index + 1}`,
                description: waypoint.description || "Route waypoint",
                color: "#F59E0B",
              }}
              isNew={false}
              ref={ref as React.RefObject<L.Map | null>}
              originalPositionRef={originalPositionRef}
            />,
          );
        }
      });
    }

    return routeMarkerComponents;
  }, [route, markers, ref, originalPositionRef]);

  return (
    <MapContainer
      center={
        view.latitude !== undefined && view.longitude !== undefined
          ? [view.latitude, view.longitude]
          : undefined
      }
      zoom={view.zoom !== undefined ? view.zoom : undefined}
      scrollWheelZoom={true}
      style={{ height: "100%", width: "100%" }}
      ref={ref}
    >
      <style jsx global>{`
        .route-tooltip {
          background: rgba(255, 255, 255, 0.6) !important;
          backdrop-filter: blur(6px) !important;
          -webkit-backdrop-filter: blur(6px) !important;
          border: 1px solid rgba(255, 255, 255, 0.5) !important;
          border-radius: 12px !important;
          box-shadow:
            0 4px 8px rgba(0, 0, 0, 0.15),
            0 0 20px rgba(0, 0, 0, 0.1) !important;
          font-weight: 600 !important;
          padding: 6px 12px !important;
          white-space: nowrap !important;
          font-family:
            var(--font-geist-sans),
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            system-ui,
            sans-serif !important;
          text-shadow: none !important;
          color: #1e293b !important;
        }
        .route-tooltip::before {
          display: none !important;
        }
        .leaflet-tooltip-pane .route-tooltip {
          pointer-events: none !important;
        }
        .route-tooltip .flex {
          display: flex !important;
          align-items: center !important;
          gap: 4px !important;
        }
      `}</style>
      {/* Satellite imagery base layer */}
      <TileLayer
        attribution='&copy; <a href="https://www.esri.com/">Esri</a> &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      />
      {/* Roads and labels overlay */}
      <TileLayer
        attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}"
        opacity={0.8}
      />
      {memoizedRoute}
      {routeMarkers}
      <MarkerClusterGroup
        iconCreateFunction={createClusterIcon}
        chunkedLoading={false}
        spiderfyOnMaxZoom={true}
        maxClusterRadius={60}
        showCoverageOnHover={false}
        disableClusteringAtZoom={15}
        removeOutsideVisibleBounds={false}
      >
        {memoizedMarkers}
      </MarkerClusterGroup>
    </MapContainer>
  );
};

export default Map;
