"use client";

import { useEffect, useState } from 'react';
import '../styles/permissionToggles.css';

type PermissionState = 'granted' | 'denied' | 'prompt' | 'unavailable';

interface PermissionTogglesProps {
  isSelectingPickupMode?: boolean;
  isMenuOpen?: boolean;
  onPermissionChange?: (type: 'location' | 'notification', enabled: boolean) => void;
}

export default function PermissionToggles({
  isSelectingPickupMode = false,
  isMenuOpen = false,
  onPermissionChange
}: PermissionTogglesProps) {
  const [locationPermission, setLocationPermission] = useState<PermissionState>('unavailable');
  const [notificationPermission, setNotificationPermission] = useState<PermissionState>('unavailable');
  // App-level enabled/disabled state (separate from browser permission state)
  const [locationEnabled, setLocationEnabled] = useState<boolean>(true);
  const [notificationEnabled, setNotificationEnabled] = useState<boolean>(true);

  // Check and set up location permission monitoring
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setLocationPermission('unavailable');
      return;
    }

    // Initial permission check
    const checkLocationPermission = async () => {
      try {
        if ('permissions' in navigator) {
          const permissionsAPI = navigator.permissions as { query: (opts: { name: string }) => Promise<PermissionStatus> };
          const status = await permissionsAPI.query({ name: 'geolocation' });
          setLocationPermission(status.state as PermissionState);
          
          // Monitor permission changes
          status.onchange = () => {
            setLocationPermission(status.state as PermissionState);
          };
        } else {
          // Fallback for browsers without Permissions API
          const nav = navigator as Navigator;
          nav.geolocation.getCurrentPosition(
            () => setLocationPermission('granted'),
            (error: GeolocationPositionError) => {
              if (error.code === error.PERMISSION_DENIED) {
                setLocationPermission('denied');
              } else {
                setLocationPermission('prompt');
              }
            }
          );
        }
      } catch (error) {
        console.error('Error checking geolocation permission:', error);
        setLocationPermission('unavailable');
      }
    };

    checkLocationPermission();
  }, []);

  // Check and set up notification permission monitoring
  useEffect(() => {
    if (!('Notification' in window)) {
      setNotificationPermission('unavailable');
      return;
    }

    // Initial permission state
    setNotificationPermission(Notification.permission as PermissionState);

    // Set up permission change monitoring if available
    const setupNotificationMonitoring = async () => {
      try {
        if ('permissions' in navigator) {
          const permissionsAPI = navigator.permissions as { query: (opts: { name: string }) => Promise<PermissionStatus> };
          const status = await permissionsAPI.query({ name: 'notifications' });
          setNotificationPermission(status.state as PermissionState);
          
          status.onchange = () => {
            setNotificationPermission(status.state as PermissionState);
          };
        }
      } catch (error) {
        console.log('Notification permission query not supported');
      }
    };

    setupNotificationMonitoring();
  }, []);

  // Effect to sync permission states with enabled states
  useEffect(() => {
    if (locationPermission === 'denied' || locationPermission === 'unavailable') {
      setLocationEnabled(false);
    }
    
    if (notificationPermission === 'denied' || notificationPermission === 'unavailable') {
      setNotificationEnabled(false);
    }
  }, [locationPermission, notificationPermission]);

  // Handle location toggle click
  const handleLocationToggle = async () => {
    if (locationPermission === 'granted') {
      // If permission is already granted, toggle the enabled state
      const newEnabledState = !locationEnabled;
      setLocationEnabled(newEnabledState);
      if (onPermissionChange) {
        onPermissionChange('location', newEnabledState);
      }
    } else if (locationPermission === 'denied') {
      // If denied, show instructions to re-enable
      alert('Please enable location permission in your browser settings');
    } else {
      // Request permission
      if (!('geolocation' in navigator)) {
        alert('Geolocation is not supported by your browser');
        return;
      }

      try {
        // This will trigger the browser permission prompt if needed
        const nav = navigator as Navigator;
        nav.geolocation.getCurrentPosition(
          () => {
            setLocationPermission('granted');
            setLocationEnabled(true);
            if (onPermissionChange) {
              onPermissionChange('location', true);
            }
          },
          (error: GeolocationPositionError) => {
            if (error.code === error.PERMISSION_DENIED) {
              setLocationPermission('denied');
              setLocationEnabled(false);
              if (onPermissionChange) {
                onPermissionChange('location', false);
              }
            } else {
              setLocationPermission('prompt');
            }
          },
          { timeout: 10000, enableHighAccuracy: true, maximumAge: 0 }
        );
      } catch (error) {
        console.error('Error requesting location permission:', error);
      }
    }
  };

  // Handle notification toggle click
  const handleNotificationToggle = async () => {
    if (notificationPermission === 'granted') {
      // If permission is already granted, toggle the enabled state
      const newEnabledState = !notificationEnabled;
      setNotificationEnabled(newEnabledState);
      if (onPermissionChange) {
        onPermissionChange('notification', newEnabledState);
      }
    } else if (notificationPermission === 'denied') {
      // If denied, show instructions to re-enable
      alert('Please enable notification permission in your browser settings');
    } else {
      // Request permission
      if (!('Notification' in window)) {
        alert('Notifications are not supported by your browser');
        return;
      }

      try {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission as PermissionState);
        const isEnabled = permission === 'granted';
        setNotificationEnabled(isEnabled);
        if (onPermissionChange) {
          onPermissionChange('notification', isEnabled);
        }
      } catch (error) {
        console.error('Error requesting notification permission:', error);
      }
    }
  };


  // Build CSS class names based on props
  const togglesClassName = `permission-toggles ${  
    isSelectingPickupMode ? 'is-selecting' : '' 
  } ${  
    isMenuOpen ? 'is-menu-open' : ''
  }`;

  // Determine actual status for the UI (considers both permission and enabled state)
  const locationStatus = locationPermission === 'granted' && locationEnabled ? 'active' : 'inactive';
  const notificationStatus = notificationPermission === 'granted' && notificationEnabled ? 'active' : 'inactive';

  return (
    <div className={togglesClassName}>
      <button
        className={`permission-toggle ${locationStatus}`}
        onClick={handleLocationToggle}
        aria-label={`Location is ${locationStatus === 'active' ? 'on' : 'off'}. Click to ${locationStatus === 'active' ? 'disable' : 'enable'}`}
        title={locationStatus === 'active' ? 'Location On' : 'Location Off'}
      >
        <span className="material-icon">location_on</span>
        <span className="permission-label">Location</span>
        <span className="toggle-indicator"></span>
      </button>

      <button
        className={`permission-toggle ${notificationStatus}`}
        onClick={handleNotificationToggle}
        aria-label={`Notifications are ${notificationStatus === 'active' ? 'on' : 'off'}. Click to ${notificationStatus === 'active' ? 'disable' : 'enable'}`}
        title={notificationStatus === 'active' ? 'Alerts On' : 'Alerts Off'}
      >
        <span className="material-icon">notifications</span>
        <span className="permission-label">Alerts</span>
        <span className="toggle-indicator"></span>
      </button>
    </div>
  );
}

