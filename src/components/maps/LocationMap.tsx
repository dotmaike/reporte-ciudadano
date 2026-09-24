'use client';

import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';

// Fix for default marker icons in Next.js
const markerIcon = new L.Icon({
  iconUrl: '/leaflet/marker-icon.png',
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  shadowUrl: '/leaflet/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface LocationMapProps {
  lat: number;
  lng: number;
  zoom?: number;
  className?: string;
}

// Component to recenter map when coordinates change
function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();

  useEffect(() => {
    if (lat !== 0 && lng !== 0) {
      map.setView([lat, lng], map.getZoom());
    }
  }, [lat, lng, map]);

  return null;
}

export function LocationMap({ lat, lng, zoom = 16, className }: LocationMapProps) {
  const [tileError, setTileError] = useState(false);

  // Default center to Coatepec, Veracruz if no location yet
  const center: [number, number] = lat !== 0 && lng !== 0 ? [lat, lng] : [19.4522, -96.9614];
  const hasLocation = lat !== 0 && lng !== 0;

  return (
    <div className="relative">
      <MapContainer
        center={center}
        zoom={hasLocation ? zoom : 13}
        scrollWheelZoom={false}
        className={className}
        style={{ height: '200px', width: '100%', borderRadius: '0.375rem' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          eventHandlers={{
            tileerror: () => setTileError(true),
            load: () => setTileError(false),
          }}
        />
        {hasLocation && (
          <>
            <Marker position={[lat, lng]} icon={markerIcon} />
            <RecenterMap lat={lat} lng={lng} />
          </>
        )}
      </MapContainer>
      {tileError && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-md bg-background/85 px-3 text-center text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <AlertTriangle className="h-4 w-4" />
            No se pudo cargar el mapa. Verifica tu conexión.
          </span>
        </div>
      )}
    </div>
  );
}
