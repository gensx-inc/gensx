"use client";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-markercluster";
import Image from "next/image";
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

const escapeHtml = (text: string): string => {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
};

const sanitizeColor = (color: string): string => {
  // Only allow valid hex colors (3 or 6 digit) or basic CSS color names
  const hexPattern = /^#([0-9A-F]{3}|[0-9A-F]{6})$/i;
  const basicColors = [
    "red",
    "blue",
    "green",
    "yellow",
    "orange",
    "purple",
    "black",
    "white",
    "gray",
    "pink",
  ];

  if (hexPattern.test(color) || basicColors.includes(color.toLowerCase())) {
    return color;
  }

  // Default to safe color if invalid
  return "#3B82F6";
};

const sanitizeUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    // Only allow http/https protocols
    if (urlObj.protocol === "http:" || urlObj.protocol === "https:") {
      return urlObj.toString();
    }
  } catch {
    // Invalid URL
  }

  // Return empty string for invalid URLs
  return "";
};

const createMarkerIcon = (
  color: string = "#3B82F6",
  photoUrl?: string,
  isNew: boolean = false,
  title?: string,
) => {
  const sanitizedColor = sanitizeColor(color);
  const animationClass = isNew ? " new-marker" : "";
  const displayTitle = title ? escapeHtml(title) : "";

  if (photoUrl) {
    const sanitizedPhotoUrl = sanitizeUrl(photoUrl);

    // Don't create photo marker if URL is invalid
    if (!sanitizedPhotoUrl) {
      // Fall back to regular marker with label
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
    }

    const photoIcon = `
      <div class="marker-with-label">
        <div class="photo-marker">
          <img src="${escapeHtml(sanitizedPhotoUrl)}" alt="Marker photo" class="marker-photo" style="border-color: ${sanitizedColor};" />
          <div class="photo-marker-pointer" style="border-top-color: ${sanitizedColor};"></div>
        </div>
        ${displayTitle ? `<div class="marker-label photo-marker-label">${displayTitle}</div>` : ""}
      </div>
    `;

    return L.divIcon({
      html: photoIcon,
      className: `custom-photo-marker${animationClass}`,
      iconSize: [120, displayTitle ? 95 : 80],
      iconAnchor: [60, displayTitle ? 95 : 70],
      popupAnchor: [0, displayTitle ? -95 : -70],
    });
  }

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
  const hasPhoto = marker.photoUrl && marker.photoUrl.length > 0;

  return (
    <div className="max-w-xs">
      {marker.title && <h3 className="font-semibold mb-2">{marker.title}</h3>}
      {marker.description && (
        <p className="text-sm text-gray-600 mb-2">{marker.description}</p>
      )}
      {hasPhoto && (
        <div className="border-t pt-2">
          <div className="max-h-64 overflow-y-auto">
            <Image
              src={marker.photoUrl!}
              alt="Marker photo"
              width={320}
              height={240}
              className="w-full h-auto rounded-md"
              sizes="(max-width: 320px) 100vw, 320px"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
              }}
            />
          </div>
        </div>
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
      icon={createMarkerIcon(
        marker.color,
        marker.photoUrl,
        isNew,
        marker.title,
      )}
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
    if (!route || !route.geometry || !route.geometry.coordinates) return null;

    // Convert GeoJSON coordinates to Leaflet format [lat, lng]
    const positions = route.geometry.coordinates
      .filter((coord: number[]) => coord.length >= 2)
      .map((coord: number[]): [number, number] => [coord[1], coord[0]]);

    return (
      <Polyline
        key={route.id}
        positions={positions}
        pathOptions={{
          color: "#3B82F6",
          weight: 5,
          opacity: 0.8,
        }}
      />
    );
  }, [route]);

  // Create start, waypoint, and end markers for the route
  const routeMarkers = useMemo(() => {
    if (!route) return [];

    const markers = [
      <MapMarkerComponent
        key={`${route.id}-start`}
        marker={route.start}
        isNew={false}
        ref={ref as React.RefObject<L.Map | null>}
        originalPositionRef={originalPositionRef}
      />,
      <MapMarkerComponent
        key={`${route.id}-end`}
        marker={route.end}
        isNew={false}
        ref={ref as React.RefObject<L.Map | null>}
        originalPositionRef={originalPositionRef}
      />,
    ];

    // Add waypoint markers
    if (route.waypoints && route.waypoints.length > 0) {
      route.waypoints.forEach((waypoint, index) => {
        markers.push(
          <MapMarkerComponent
            key={`${route.id}-waypoint-${index}`}
            marker={{
              ...waypoint,
              id: `${route.id}-waypoint-${index}`,
            }}
            isNew={false}
            ref={ref as React.RefObject<L.Map | null>}
            originalPositionRef={originalPositionRef}
          />,
        );
      });
    }

    return markers;
  }, [route, ref, originalPositionRef]);

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
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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
