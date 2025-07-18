"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-markercluster";
import Image from "next/image";
import { useRef, useEffect, useMemo } from "react";

import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";
import { MapMarker, MapView } from "@/hooks/useMapTools";
import L from "leaflet";

// Create cluster icon with count
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createClusterIcon = (cluster: any) => {
  const count = cluster.getChildCount();

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

  const scale = size / 32; // Scale based on original 32px size
  const clusterIcon = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <g transform="scale(${scale})">
        <path d="M16 2C11.589 2 8 5.589 8 10c0 7.5 8 18 8 18s8-10.5 8-18c0-4.411-3.589-8-8-8z" fill="${bgColor}" stroke="#ffffff" stroke-width="2"/>
      </g>
      <text x="${size / 2}" y="${size / 2 - 4}" text-anchor="middle" dominant-baseline="middle" fill="white" font-family="Arial, sans-serif" font-size="${size > 45 ? "14px" : "12px"}" font-weight="bold">${count}</text>
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
}

const defaultView = {
  zoom: 12,
  latitude: 37.7749, // San Francisco
  longitude: -122.4194,
};

const createMarkerIcon = (color: string = "#3B82F6", photoUrl?: string) => {
  if (photoUrl) {
    const photoIcon = `
      <div class="photo-marker">
        <img src="${photoUrl}" alt="Marker photo" class="marker-photo" style="border-color: ${color};" />
        <div class="photo-marker-pointer" style="border-top-color: ${color};"></div>
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
      <path d="M16 2C11.589 2 8 5.589 8 10c0 7.5 8 18 8 18s8-10.5 8-18c0-4.411-3.589-8-8-8z" fill="${color}" stroke="#ffffff" stroke-width="2"/>
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
  const { ref, markers, view = defaultView } = MapProps;
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
    console.log("Memoizing markers - count:", markers?.length, "ref:", !!ref?.current);
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
              console.log('Marker clicked:', marker.id);
              if (ref?.current) {
                originalPositionRef.current = {
                  center: ref.current.getCenter(),
                  zoom: ref.current.getZoom(),
                };
              }
              // Prevent event from bubbling to map
              e.originalEvent?.stopPropagation();
            },
            touchstart: (e) => {
              console.log('Marker touchstart:', marker.id);
              // Prevent map pan/zoom during marker touch
              e.originalEvent?.stopPropagation();
            },
          }}
        >
          <Popup
            closeOnEscapeKey={false}
            closeOnClick={false}
            eventHandlers={{
              add: () => {
                console.log('Popup opened for marker:', marker.id);
              },
              remove: () => {
                console.log('Popup closed for marker:', marker.id);
                if (originalPositionRef.current) {
                  setTimeout(() => {
                    if (ref?.current) {
                      ref.current.setView(
                        originalPositionRef.current!.center,
                        originalPositionRef.current!.zoom,
                      );
                      originalPositionRef.current = null;
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
      <MarkerClusterGroup
        iconCreateFunction={createClusterIcon}
        chunkedLoading={true}
        spiderfyOnMaxZoom={true}
        maxClusterRadius={100}
        showCoverageOnHover={false}
      >
        {memoizedMarkers}
      </MarkerClusterGroup>
    </MapContainer>
  );
};

export default Map;
