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
import { useRef, useEffect, useMemo } from "react";

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

const defaultView = {
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

const createMarkerIcon = (color: string = "#3B82F6", photoUrl?: string) => {
  const sanitizedColor = sanitizeColor(color);

  if (photoUrl) {
    const sanitizedPhotoUrl = sanitizeUrl(photoUrl);

    // Don't create photo marker if URL is invalid
    if (!sanitizedPhotoUrl) {
      // Fall back to regular marker
      const svgIcon = `
        <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 2C11.589 2 8 5.589 8 10c0 7.5 8 18 8 18s8-10.5 8-18c0-4.411-3.589-8-8-8z" fill="${sanitizedColor}" stroke="#ffffff" stroke-width="2"/>
          <circle cx="16" cy="10" r="3" fill="#ffffff"/>
        </svg>
      `;

      return L.divIcon({
        html: svgIcon,
        className: "custom-marker",
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
      });
    }

    const photoIcon = `
      <div class="photo-marker">
        <img src="${escapeHtml(sanitizedPhotoUrl)}" alt="Marker photo" class="marker-photo" style="border-color: ${sanitizedColor};" />
        <div class="photo-marker-pointer" style="border-top-color: ${sanitizedColor};"></div>
      </div>
    `;

    return L.divIcon({
      html: photoIcon,
      className: "custom-photo-marker",
      iconSize: [80, 80],
      iconAnchor: [40, 70],
      popupAnchor: [0, -70],
    });
  }

  const svgIcon = `
    <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 2C11.589 2 8 5.589 8 10c0 7.5 8 18 8 18s8-10.5 8-18c0-4.411-3.589-8-8-8z" fill="${sanitizedColor}" stroke="#ffffff" stroke-width="2"/>
      <circle cx="16" cy="10" r="3" fill="#ffffff"/>
    </svg>
  `;

  return L.divIcon({
    html: svgIcon,
    className: "custom-marker",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
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

const Map = (MapProps: MapProps) => {
  const { ref, markers, view = defaultView, route } = MapProps;
  const originalPositionRef = useRef<{ center: L.LatLng; zoom: number } | null>(
    null,
  );

  useEffect(() => {
    if (!view || !view.latitude || !view.longitude) {
      return;
    }
    if (ref?.current) {
      ref.current.setView([view.latitude, view.longitude], view.zoom);
    }
  }, [view, ref]);

  // Memoize markers with clustering to prevent flickering during streaming
  const memoizedMarkers = useMemo(() => {
    if (!markers) return [];

    return markers.map((item) => {
      // Render single marker
      const marker = item as MapMarker;
      return (
        <Marker
          key={marker.id}
          position={[marker.latitude, marker.longitude]}
          draggable={false}
          icon={createMarkerIcon(marker.color, marker.photoUrl)}
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

    const startIcon = createMarkerIcon("#10B981");
    const endIcon = createMarkerIcon("#EF4444");
    const waypointIcon = createMarkerIcon("#F59E0B");

    const markers = [
      <Marker
        key={`${route.id}-start`}
        position={[route.startLat, route.startLon]}
        icon={startIcon}
      >
        <Popup>
          <div>
            <strong>Start</strong>
            {route.startLabel && (
              <>
                <br />
                <small>{route.startLabel}</small>
              </>
            )}
            <br />
            {route.distanceText} • {route.durationText}
            <br />
            <small>Mode: {route.profile.replace("-", " ")}</small>
          </div>
        </Popup>
      </Marker>,
      <Marker
        key={`${route.id}-end`}
        position={[route.endLat, route.endLon]}
        icon={endIcon}
      >
        <Popup>
          <div>
            <strong>Destination</strong>
            {route.endLabel && (
              <>
                <br />
                <small>{route.endLabel}</small>
              </>
            )}
            <br />
            {route.directions.length} turn
            {route.directions.length !== 1 ? "s" : ""}
          </div>
        </Popup>
      </Marker>,
    ];

    // Add waypoint markers
    if (route.waypoints && route.waypoints.length > 0) {
      route.waypoints.forEach((waypoint, index) => {
        markers.push(
          <Marker
            key={`${route.id}-waypoint-${index}`}
            position={[waypoint.lat, waypoint.lon]}
            icon={waypointIcon}
          >
            <Popup>
              <div>
                <strong>Stop {index + 1}</strong>
                {waypoint.label && (
                  <>
                    <br />
                    <small>{waypoint.label}</small>
                  </>
                )}
              </div>
            </Popup>
          </Marker>,
        );
      });
    }

    return markers;
  }, [route]);

  return (
    <MapContainer
      center={[view.latitude, view.longitude]}
      zoom={view.zoom}
      scrollWheelZoom={false}
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
