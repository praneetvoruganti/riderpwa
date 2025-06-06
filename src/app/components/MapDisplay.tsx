"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L, { LatLngExpression, LeafletMouseEvent } from 'leaflet';
import { useEffect, useState, useRef } from 'react';

// Import styles directly
import '../styles/mapDisplay.css';

// We're using URL strings directly since import of image assets might not be set up correctly

// Fix for default icon issues with Webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;

// Create custom SVG-based icons instead of relying on external image files
// Current location icon (blue dot - simpler design to avoid overflow)
const userSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <circle cx="12" cy="12" r="10" fill="#3498db" stroke="white" stroke-width="2"/>
  <circle cx="12" cy="12" r="4" fill="white"/>
</svg>
`;

// Pickup location icon (red pin - simpler design to avoid overflow)
const pickupSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 32" width="24" height="32">
  <path d="M12 0 C7 0 3 4 3 9 C3 16 12 24 12 24 C12 24 21 16 21 9 C21 4 17 0 12 0 Z" fill="#e74c3c" stroke="white" stroke-width="2"/>
  <circle cx="12" cy="9" r="3" fill="white"/>
</svg>
`;

const blueIcon = L.divIcon({
  className: 'custom-marker-icon current-location',
  html: userSvg,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12]
});

const pickupIcon = L.divIcon({
  className: 'custom-marker-icon pickup-location',
  html: pickupSvg,
  iconSize: [24, 32],
  iconAnchor: [12, 32], // Pin bottom should be at the exact location
  popupAnchor: [0, -32] // Position popup above the pin
});

// Initialize default icons as well
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
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
    
    // Enable dragging for mobile specifically
    if (map) {
      map.dragging.enable();
      map.touchZoom.enable();
      map.doubleClickZoom.enable();
      map.scrollWheelZoom.enable();
      map.keyboard.enable();
    }
  }, [center, zoom, map]);
  return null;
};

// Component to handle map clicks and show temporary markers
const MapClickHandler = ({ onMapClick, isSelectingPickup }: { onMapClick?: (latlng: L.LatLng) => void, isSelectingPickup?: boolean }) => {
  const [tempMarker, setTempMarker] = useState<L.LatLng | null>(null);
  const map = useMap();
  
  useMapEvents({
    click(e: LeafletMouseEvent) {
      if (isSelectingPickup && onMapClick) {
        setTempMarker(e.latlng);
        onMapClick(e.latlng);
      }
    },
    zoom() {
      // Allow zoom events to propagate normally
    }
  });

  return tempMarker && isSelectingPickup ? (
    <Marker position={tempMarker} icon={pickupIcon}>
      <Popup>
        <strong>Selected location:</strong><br />
        {tempMarker.lat.toFixed(6)}, {tempMarker.lng.toFixed(6)}
      </Popup>
    </Marker>
  ) : null;
};

// Component to add extra zoom controls
const ZoomControl = () => {
  const map = useMap();
  
  const handleZoomIn = () => {
    map.zoomIn(1);
  };
  
  const handleZoomOut = () => {
    map.zoomOut(1);
  };
  
  const handleResetView = () => {
    if (map.getZoom() < 14) {
      map.setZoom(15);
    }
  };
  
  return (
    <div className="custom-zoom-controls">
      <button onClick={handleZoomIn} className="zoom-btn zoom-in" title="Zoom in">
        <strong>+</strong>
      </button>
      <button onClick={handleZoomOut} className="zoom-btn zoom-out" title="Zoom out">
        <strong>−</strong>
      </button>
      <button onClick={handleResetView} className="zoom-btn reset-view" title="Reset view">
        <strong>⟳</strong>
      </button>
    </div>
  );
};

// Map legend component
const MapLegend = () => {
  return (
    <div className="map-legend">
      <div className="legend-item">
        <div className="legend-icon blue"></div>
        <span>Your Current Location</span>
      </div>
      <div className="legend-item">
        <div className="legend-icon red"></div>
        <span>Pickup Location</span>
      </div>
    </div>
  );
};

const MapDisplay: React.FC<MapDisplayProps> = ({ 
  userPosition, 
  pickupPosition,
  zoom = 16, // Using an even more zoomed-in default for better precision
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
        zoomControl={false} /* Disable default zoom control - we'll add a custom one */
        doubleClickZoom={true}
        dragging={true} /* Enable map dragging/panning explicitly */
        style={{ height: '100%', width: '100%', minHeight: '300px', cursor: isSelectingPickup ? 'crosshair' : 'grab' }}
        className="premium-map"
        minZoom={10} /* Limit minimum zoom to prevent zooming out too far */
        maxZoom={19} /* Allow very detailed zoom */
        attributionControl={false} /* Hide attribution to save space */
        touchZoom={true} /* Enable pinch zoom on mobile */
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {/* User location marker if available */}
      {userPosition && (
        <Marker position={userPosition} icon={blueIcon}>
          <Popup>
            <strong>Your Current Location</strong><br />
            {userLocationText || 'Location data available'}
          </Popup>
        </Marker>
      )}  
      
      {/* Pickup location marker if available */}
      {pickupPosition && (
        <Marker position={pickupPosition} icon={pickupIcon}>
          <Popup>
            <strong>Selected Pickup Location</strong><br />
            {L.latLng(pickupPosition).lat.toFixed(6)}, {L.latLng(pickupPosition).lng.toFixed(6)}
          </Popup>
        </Marker>
      )}
      <MapClickHandler onMapClick={onMapClick} isSelectingPickup={isSelectingPickup} />
      {userPosition && <ChangeView center={mapCenter} zoom={zoom} />}
      <ZoomControl />
      <MapLegend />
      
      {/* Attribution control with smaller font */}
      <div className="map-attribution">
        © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors
      </div>
    </MapContainer>
  );
};

export default MapDisplay;
