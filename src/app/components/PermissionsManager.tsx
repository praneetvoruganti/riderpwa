"use client";

import { useEffect, useState } from 'react';

interface PermissionsStatus {
  geolocation: PermissionState | null;
  notifications: PermissionState | null;
}

interface PermissionsManagerProps {
  onPermissionsUpdate: (status: PermissionsStatus) => void;
}

export default function PermissionsManager({ onPermissionsUpdate }: PermissionsManagerProps) {
  const [permissions, setPermissions] = useState<PermissionsStatus>({
    geolocation: null,
    notifications: null,
  });

  useEffect(() => {
    const requestPermissions = async () => {
      let geoStatus: PermissionState = 'prompt';
      let notifStatus: PermissionState = 'prompt';

      // Geolocation
      if ('geolocation' in navigator) {
        try {
          const status = await navigator.permissions.query({ name: 'geolocation' });
          geoStatus = status.state;
          status.onchange = () => {
            setPermissions(prev => ({ ...prev, geolocation: status.state }));
            onPermissionsUpdate({ geolocation: status.state, notifications: permissions.notifications });
          };

          if (geoStatus === 'prompt') {
            navigator.geolocation.getCurrentPosition(
              () => {
                // Success, state will be updated by onchange or subsequent query
                navigator.permissions.query({ name: 'geolocation' }).then(s => {
                    setPermissions(prev => ({ ...prev, geolocation: s.state }));
                    onPermissionsUpdate({ geolocation: s.state, notifications: permissions.notifications });
                });
              },
              () => {
                // Denied or error, state will be updated by onchange or subsequent query
                 navigator.permissions.query({ name: 'geolocation' }).then(s => {
                    setPermissions(prev => ({ ...prev, geolocation: s.state }));
                    onPermissionsUpdate({ geolocation: s.state, notifications: permissions.notifications });
                });
              },
              { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
          }
        } catch (error) {
          console.error('Error querying geolocation permission:', error);
          geoStatus = 'denied'; // Assume denied if query fails
        }
      } else {
        console.log('Geolocation API not available.');
        geoStatus = 'denied'; // Treat as unavailable
      }

      // Notifications: Only query initial status. Do not prompt automatically.
      if ('Notification' in window) {
        try {
          const status = await navigator.permissions.query({ name: 'notifications' });
          notifStatus = status.state;
          status.onchange = () => {
            setPermissions(prev => ({ ...prev, notifications: status.state }));
            // Ensure onPermissionsUpdate is called with the most recent geo status
            navigator.permissions.query({ name: 'geolocation' }).then(currentGeoStatus => {
              onPermissionsUpdate({ geolocation: currentGeoStatus.state, notifications: status.state });
            });
          };
        } catch (error) {
          console.error('Error querying notifications permission:', error);
          notifStatus = 'denied'; // Assume denied if query fails
        }
      } else {
        console.log('Notifications API not available.');
        notifStatus = 'denied'; // Treat as unavailable
      }
      
      setPermissions({ geolocation: geoStatus, notifications: notifStatus });
      onPermissionsUpdate({ geolocation: geoStatus, notifications: notifStatus });
    };

    requestPermissions();
  }, [onPermissionsUpdate]); // Removed 'permissions' from dependency array as it could cause loops with onchange

  // This component doesn't render anything itself
  return null;
}
