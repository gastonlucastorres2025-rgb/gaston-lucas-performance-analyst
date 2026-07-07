"use client";

import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import { COUNTRY_COORDS } from "@/lib/scouting-geo";

export function ScoutingMap({ countryCounts }: { countryCounts: Record<string, number> }) {
  const entries = Object.entries(countryCounts).filter(
    ([pais]) => COUNTRY_COORDS[pais],
  );

  return (
    <MapContainer
      center={[-20, -60]}
      zoom={3}
      scrollWheelZoom={false}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {entries.map(([pais, count]) => (
        <CircleMarker
          key={pais}
          center={COUNTRY_COORDS[pais]}
          radius={7 + Math.sqrt(count) * 3}
          pathOptions={{
            color: "#0b3d91",
            fillColor: "#0b3d91",
            fillOpacity: 0.45,
            weight: 1,
          }}
        >
          <Popup>
            <strong>{pais}</strong>
            <br />
            {count} jugador{count === 1 ? "" : "es"} en seguimiento
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
