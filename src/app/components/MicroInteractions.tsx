'use client';

import { useEffect } from 'react';

/**
 * MicroInteractions - Component that adds premium micro-animations to the UI
 * 
 * This component adds event listeners for hover and click effects on cards and buttons,
 * creating a more premium and tactile feel to the interface.
 */
export default function MicroInteractions() {
  useEffect(() => {
    // Card hover effect
    const cards = document.querySelectorAll('.card');
    
    const handleMouseMove = (e: Event) => {
      const mouseEvent = e as MouseEvent;
      const card = mouseEvent.currentTarget as HTMLElement;
      const rect = card.getBoundingClientRect();
      const x = mouseEvent.clientX - rect.left;
      const y = mouseEvent.clientY - rect.top;
      
      card.style.setProperty('--x', `${x}px`);
      card.style.setProperty('--y', `${y}px`);
    };
    
    cards.forEach(card => {
      card.addEventListener('mousemove', handleMouseMove);
    });
    
    // Button press effect
    const buttons = document.querySelectorAll('.btn');
    
    const handleButtonClick = (e: Event) => {
      const mouseEvent = e as MouseEvent;
      const button = mouseEvent.currentTarget as HTMLElement;
      const rect = button.getBoundingClientRect();
      const x = mouseEvent.clientX - rect.left;
      const y = mouseEvent.clientY - rect.top;
      
      button.style.setProperty('--x', `${x}px`);
      button.style.setProperty('--y', `${y}px`);
    };
    
    buttons.forEach(button => {
      button.addEventListener('click', handleButtonClick);
    });
    
    // Cleanup
    return () => {
      cards.forEach(card => {
        card.removeEventListener('mousemove', handleMouseMove);
      });
      
      buttons.forEach(button => {
        button.removeEventListener('click', handleButtonClick);
      });
    };
  }, []);
  
  return null; // This component doesn't render anything
}
