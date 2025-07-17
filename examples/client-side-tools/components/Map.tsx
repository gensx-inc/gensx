"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";

import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";
import { MapMarker, MapView } from "@/hooks/useMapTools";
import L from "leaflet";
import { useEffect } from "react";

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

const createMarkerIcon = (color: string = "#3B82F6") => {
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

const Map = (MapProps: MapProps) => {
  const { ref, markers, view = defaultView } = MapProps;

  useEffect(() => {
    if (!view || !view.latitude || !view.longitude) {
      return;
    }
    if (ref?.current) {
      ref.current.setView([view.latitude, view.longitude], view.zoom);
    }
  }, [view, ref]);

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
      {markers?.map((marker) => (
        <Marker
          key={marker.id}
          position={[marker.latitude, marker.longitude]}
          draggable={false}
          icon={createMarkerIcon(marker.color)}
        >
          <Popup>
            <div>
              <h3>{marker.title}</h3>
              <p>{marker.description}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default Map;
