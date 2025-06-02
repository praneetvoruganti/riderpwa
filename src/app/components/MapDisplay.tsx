"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L, { LatLngExpression, LeafletMouseEvent } from 'leaflet';
import { useEffect } from 'react';

// Fix for default icon issues with Webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Custom icon for pickup location
const pickupIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x-red.png', // Using a red marker for distinction
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface MapDisplayProps {
  userPosition: LatLngExpression | null; // Renamed for clarity
  pickupPosition: LatLngExpression | null;
  zoom?: number;
  userLocationText?: string;
  onMapClick?: (latlng: L.LatLng) => void;
  isSelectingPickup?: boolean; 
}

// Component to update map view when userPosition changes
const ChangeView = ({ center, zoom }: { center: LatLngExpression, zoom: number }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  return null;
};

// Component to handle map clicks
const MapClickHandler = ({ onMapClick, isSelectingPickup }: { onMapClick?: (latlng: L.LatLng) => void, isSelectingPickup?: boolean }) => {
  useMapEvents({
    click(e: LeafletMouseEvent) {
      if (isSelectingPickup && onMapClick) {
        onMapClick(e.latlng);
      }
    },
  });
  return null;
};

const MapDisplay: React.FC<MapDisplayProps> = ({ 
  userPosition, 
  pickupPosition,
  zoom = 13, 
  userLocationText,
  onMapClick,
  isSelectingPickup
}) => {
  if (typeof window === 'undefined') {
    return null;
  }

  const defaultPosition: LatLngExpression = [51.505, -0.09];
  const mapCenter = userPosition ? L.latLng(userPosition) : L.latLng(defaultPosition);

  return (
    <MapContainer 
        center={mapCenter} 
        zoom={zoom} 
        scrollWheelZoom={true}
        zoomControl={true}
        doubleClickZoom={true}
        style={{ height: '100%', width: '100%', minHeight: '400px', cursor: isSelectingPickup ? 'crosshair' : 'grab' }}
        className="premium-map"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {userPosition && (
        <Marker position={L.latLng(userPosition)}>
          <Popup>
            {userLocationText || `User: ${L.latLng(userPosition).lat.toFixed(4)}, ${L.latLng(userPosition).lng.toFixed(4)}`}
          </Popup>
        </Marker>
      )}
      {pickupPosition && (
        <Marker position={L.latLng(pickupPosition)} icon={pickupIcon}>
          <Popup>
            {`Pickup: ${L.latLng(pickupPosition).lat.toFixed(4)}, ${L.latLng(pickupPosition).lng.toFixed(4)}`}
          </Popup>
        </Marker>
      )}
      <MapClickHandler onMapClick={onMapClick} isSelectingPickup={isSelectingPickup} />
      {userPosition && <ChangeView center={mapCenter} zoom={zoom} />}
    </MapContainer>
  );
};

export default MapDisplay;
