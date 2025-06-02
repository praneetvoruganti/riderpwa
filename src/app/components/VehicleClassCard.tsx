"use client";

import React from 'react';

export interface VehicleClass {
  id: string;
  name: string;
  description: string;
  pricePerKm: number;
  imageUrl?: string;
}

interface VehicleClassCardProps {
  vehicleClass: VehicleClass;
  isSelected: boolean;
  onSelect: (vehicleClass: VehicleClass) => void;
}

/**
 * VehicleClassCard - A selectable card showing vehicle class options
 * 
 * Displays vehicle name, description, price per km, and optional image.
 * Uses the card-selected class for highlighting the selected option.
 * Includes subtle animation on tap for tactile feedback.
 */
const VehicleClassCard: React.FC<VehicleClassCardProps> = ({ vehicleClass, isSelected, onSelect }) => {
  return (
    <div 
      onClick={() => onSelect(vehicleClass)}
      className={`card card-interactive ${isSelected ? 'card-selected' : ''}`}
      style={{
        transition: 'all var(--transition-fast)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <div style={{ flex: 1 }}>
        <div className="flex justify-between items-center mb-xs">
          <h3 className="text-lg font-semibold">{vehicleClass.name}</h3>
          <span className="text-lg font-bold" style={{ color: 'var(--color-primary)' }}>
            ${vehicleClass.pricePerKm.toFixed(2)}
          </span>
        </div>
        <p className="text-sm" style={{ color: 'var(--color-dark-gray)' }}>{vehicleClass.description}</p>
        <div className="mt-xs">
          <span className="text-sm" style={{ color: 'var(--color-mid-gray)' }}>per km</span>
        </div>
      </div>
      {vehicleClass.imageUrl && (
        <div style={{ marginLeft: 'var(--space-md)' }}>
          <img 
            src={vehicleClass.imageUrl} 
            alt={vehicleClass.name} 
            style={{ 
              width: '80px', 
              height: '50px', 
              objectFit: 'cover', 
              borderRadius: 'var(--radius-sm)' 
            }} 
          />
        </div>
      )}
    </div>
  );
};

export default VehicleClassCard;
