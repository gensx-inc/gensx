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
  zoom: 19,
  latitude: 4.79029,
  longitude: -75.69003,
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
          icon={L.icon({
            iconUrl: "/marker-icon.png",
            iconSize: [32, 32],
            iconAnchor: [16, 16],
            popupAnchor: [0, -10],
          })}
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
