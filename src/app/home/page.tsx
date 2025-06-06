"use client";

import { useEffect, useState, useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import L, { LatLngExpression, LatLng } from 'leaflet'; 
import { isLoggedIn, clearRiderSession } from '../utils/auth';
import PermissionsManager from '../components/PermissionsManager';
import PermissionToggles from '../components/PermissionToggles';
import VehicleClassCard, { VehicleClass } from '../components/VehicleClassCard';
import MicroInteractions from '../components/MicroInteractions';

// Import styles
import '../styles/permissionToggles.css';
import '@/app/styles/mapDisplay.css';
import '@/app/styles/vehicleSelection.css';
import '@/app/styles/driverOffer.css';
import '@/app/styles/compactScreens.css';

const MapDisplay = dynamic(() => import('@/app/components/MapDisplay'), {
  ssr: false,
  loading: () => <p style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#616161' }}>Loading map...</p>
});

interface AppPermissionsStatus {
  geolocation: PermissionState | null;
  notifications: PermissionState | null;
}

enum HomePageView {
  MAP_AND_DESTINATION = 'MAP_AND_DESTINATION',
  VEHICLE_SELECTION = 'VEHICLE_SELECTION',
  SEARCHING_FOR_DRIVER = 'SEARCHING_FOR_DRIVER', 
  DRIVER_OFFER = 'DRIVER_OFFER',             
  TRIP_CONFIRMATION = 'TRIP_CONFIRMATION',
  SETTINGS = 'SETTINGS',
  PAST_RIDES = 'PAST_RIDES',
  PROMISE2PAY = 'PROMISE2PAY'
}

interface DriverOfferDetails {
  driverName: string;
  vehicleModel: string;
  vehicleLicensePlate: string;
  etaMinutes: number;
  estimatedFare: number;
}

interface PastRide {
  id: string;
  date: string;
  pickup: string;
  destination: string;
  driverName: string;
  vehicleType: string;
  fare: number;
  distance: number;
  status: 'completed' | 'cancelled';
}

interface UserSettings {
  notifications: {
    rideUpdates: boolean;
    promotions: boolean;
    accountActivity: boolean;
  };
  paymentMethods: {
    default: string;
  };
  preferences: {
    darkMode: boolean;
    language: string;
    currency: string;
  };
}

interface Promise2PayData {
  currentCollection: {
    ridesCompleted: number;
    totalRides: number;
    ridesRemaining: number;
    totalAmount: number;
    startDate: string;
    endDate: string;
  };
  collectionOptions: {
    standard: {
      active: boolean;
      ridesPerCollection: number;
      ratePerRide: number;
    };
    monthly: {
      active: boolean;
    };
  };
  collectionHistory: {
    id: string;
    startDate: string;
    endDate: string;
    rides: number;
    amount: number;
    status: 'completed' | 'in-progress';
  }[];
}

interface TripParameters {
  pickup: LatLngExpression;
  destination: string;
  radius: number;
}

// Mock past rides data
const MOCK_PAST_RIDES: PastRide[] = [
  {
    id: '1',
    date: '2025-05-20T14:30:00',
    pickup: 'Indiranagar, Bengaluru',
    destination: 'Koramangala, Bengaluru',
    driverName: 'Rajesh Kumar',
    vehicleType: 'Sedan',
    fare: 230,
    distance: 12,
    status: 'completed'
  },
  {
    id: '2',
    date: '2025-05-18T09:15:00',
    pickup: 'MG Road, Bengaluru',
    destination: 'Electronic City, Bengaluru',
    driverName: 'Suresh Patel',
    vehicleType: 'SUV',
    fare: 450,
    distance: 22,
    status: 'completed'
  },
  {
    id: '3',
    date: '2025-05-15T19:45:00',
    pickup: 'Whitefield, Bengaluru',
    destination: 'HSR Layout, Bengaluru',
    driverName: 'Amit Singh',
    vehicleType: 'Auto Rickshaw',
    fare: 180,
    distance: 14,
    status: 'completed'
  },
  {
    id: '4',
    date: '2025-05-12T11:20:00',
    pickup: 'Jayanagar, Bengaluru',
    destination: 'Malleshwaram, Bengaluru',
    driverName: 'Vijay Reddy',
    vehicleType: 'Economy',
    fare: 210,
    distance: 15,
    status: 'cancelled'
  },
  {
    id: '5',
    date: '2025-05-10T08:00:00',
    pickup: 'JP Nagar, Bengaluru',
    destination: 'Hebbal, Bengaluru',
    driverName: 'Kiran Sharma',
    vehicleType: 'Sedan',
    fare: 320,
    distance: 18,
    status: 'completed'
  }
];

// Mock user settings
const DEFAULT_USER_SETTINGS: UserSettings = {
  notifications: {
    rideUpdates: true,
    promotions: false,
    accountActivity: true,
  },
  paymentMethods: {
    default: 'UPI',
  },
  preferences: {
    darkMode: false,
    language: 'English',
    currency: 'INR',
  },
};

const MOCK_PROMISE2PAY_DATA: Promise2PayData = {
  currentCollection: {
    ridesCompleted: 16,
    totalRides: 20,
    ridesRemaining: 4,
    totalAmount: 1000, // In paise (₹10.00)
    startDate: '2025-05-05',
    endDate: 'Present',
  },
  collectionOptions: {
    standard: {
      active: true,
      ridesPerCollection: 20,
      ratePerRide: 50, // In paise (₹0.50)
    },
    monthly: {
      active: false,
    },
  },
  collectionHistory: [
    {
      id: '1',
      startDate: '2025-04-12',
      endDate: '2025-05-03',
      rides: 20,
      amount: 1000, // In paise (₹10.00)
      status: 'completed',
    },
    {
      id: '2',
      startDate: '2025-05-05',
      endDate: 'Present',
      rides: 16,
      amount: 1000, // In paise (₹10.00)
      status: 'in-progress',
    },
  ],
};

const MOCK_VEHICLE_CLASSES: VehicleClass[] = [
  {
    id: 'auto',
    name: 'Auto Rickshaw',
    description: 'Quick and convenient for short trips.',
    pricePerKm: 13,
    imageUrl: 'https://via.placeholder.com/300x150/FFD700/000000?text=Auto+Rickshaw'
  },
  {
    id: 'economy',
    name: 'Economy',
    description: 'Affordable and efficient rides.',
    pricePerKm: 15,
    imageUrl: 'https://via.placeholder.com/300x150/cccccc/000000?text=Economy+Car'
  },
  {
    id: 'premium',
    name: 'Sedan',
    description: 'Comfortable and spacious vehicles.',
    pricePerKm: 17,
    imageUrl: 'https://via.placeholder.com/300x150/A0A0A0/FFFFFF?text=Sedan'
  },
  {
    id: 'suv',
    name: 'SUV',
    description: 'Larger vehicles for groups or extra luggage.',
    pricePerKm: 19,
    imageUrl: 'https://via.placeholder.com/300x150/808080/FFFFFF?text=SUV'
  },
];

export default function HomePage() {
  // Import required CSS at the component level to ensure it's loaded
  useEffect(() => {
    // Make sure material icons are loaded for the permission toggles
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/icon?family=Material+Icons';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    
    return () => {
      document.head.removeChild(link);
    };
  }, []);
  const router = useRouter();
  const [currentView, setCurrentView] = useState<HomePageView>(HomePageView.MAP_AND_DESTINATION);
  const [tripParams, setTripParams] = useState<TripParameters | null>(null);
  const [selectedVehicleClass, setSelectedVehicleClass] = useState<VehicleClass | null>(null);
  const [searchAttempts, setSearchAttempts] = useState<number>(0);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchStatusMessage, setSearchStatusMessage] = useState<string>('');
  const [driverOffer, setDriverOffer] = useState<DriverOfferDetails | null>(null);

  // Permission state tracking - stores browser-level permission status
  const [permissionsStatus, setPermissionsStatus] = useState<AppPermissionsStatus>({
    geolocation: null,
    notifications: null,
  });
  const [currentLocation, setCurrentLocation] = useState<LatLngExpression | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [destinationInput, setDestinationInput] = useState<string>(''); 
  const [searchRadiusInput, setSearchRadiusInput] = useState<number>(1000); 
  const [isRequestingNotification, setIsRequestingNotification] = useState<boolean>(false);
  const [manualPickupLocation, setManualPickupLocation] = useState<LatLngExpression | null>(null);
  const [isSelectingPickupMode, setIsSelectingPickupMode] = useState<boolean>(false);
  const [tripDistance, setTripDistance] = useState<number | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [userSettings, setUserSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS);
  const [pastRides, setPastRides] = useState<PastRide[]>(MOCK_PAST_RIDES);
  const [promise2PayData, setPromise2PayData] = useState<Promise2PayData>(MOCK_PROMISE2PAY_DATA);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace('/login');
    }
  }, [router]);

  /**
   * Effect to fetch user location whenever permission status changes
   * This responds to both initial permission grants and changes from the toggles
   */
  useEffect(() => {
    if (permissionsStatus.geolocation === 'granted') {
      // Permission is granted, attempt to get current position
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Successfully retrieved location
          const newLocation: LatLngExpression = [position.coords.latitude, position.coords.longitude];
          setCurrentLocation(newLocation);
          setLocationError(null);
        },
        (error) => {
          // Error getting location despite permission being granted
          // This could happen if device GPS is disabled or other technical issues
          console.error('Error getting location:', error);
          setLocationError(`Error getting location: ${error.message}. Please ensure location services are enabled.`);
          setCurrentLocation(null); 
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else if (permissionsStatus.geolocation === 'denied') {
      // Permission explicitly denied by user in browser
      setLocationError('Geolocation permission denied. Cannot display current location.');
      setCurrentLocation(null);
    } else if (permissionsStatus.geolocation === 'prompt'){
      // Permission not yet decided, waiting for user response to browser prompt
      setLocationError('Geolocation permission is pending. Please respond to the prompt.');
      setCurrentLocation(null);
    }
  }, [permissionsStatus.geolocation]);

  const handleLogout = () => {
    clearRiderSession();
    router.push('/login');
  };

  const handleMenuItemClick = (item: string) => {
    setIsMenuOpen(false);
    if (item === 'Past Rides') {
      setCurrentView(HomePageView.PAST_RIDES);
    } else if (item === 'Promise2Pay') {
      setCurrentView(HomePageView.PROMISE2PAY);
    } else if (item === 'Settings') {
      setCurrentView(HomePageView.SETTINGS);
    } else if (item === 'Logout') {
      handleLogout();
    }
  };

  /**
   * Updates the app's permission status based on changes from PermissionsManager
   * This keeps track of system-level permission states (granted/denied/prompt)
   */
  const handlePermissionsUpdate = (perms: AppPermissionsStatus) => {
    setPermissionsStatus(perms);
  };

  /**
   * Handles changes from the permission toggle buttons
   * This manages the app-level enabled/disabled state for permissions
   * which is separate from the browser's permission states
   * 
   * @param type - The type of permission being toggled ('location' or 'notification')
   * @param enabled - The new state of the toggle (true/false)
   */
  const handlePermissionToggle = (type: 'location' | 'notification', enabled: boolean) => {
    // If a permission is disabled via toggle, update app state
    if (type === 'location' && !enabled) {
      // When location is disabled by the user, show an informative message
      setLocationError('Location disabled by user');
    } else if (type === 'location' && enabled && permissionsStatus.geolocation === 'granted') {
      // When location is re-enabled and permission is already granted,
      // clear any error messages and attempt to get the current location again
      setLocationError(null);
      // Re-fetch location since it was re-enabled
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation: LatLngExpression = [position.coords.latitude, position.coords.longitude];
          setCurrentLocation(newLocation);
          setLocationError(null);
        },
        (error) => {
          console.error('Error getting location:', error);
          setLocationError(`Error getting location: ${error.message}. Please ensure location services are enabled.`);
          setCurrentLocation(null); 
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
    
    // For notifications, we just need to track the state
    if (type === 'notification') {
      setPermissionsStatus(prev => ({
        ...prev,
        notifications: enabled && prev.notifications === 'granted' ? 'granted' : 'denied'
      }));
    }
  };

  /**
   * Request notification permission through system prompt
   * This is an alternative way to enable notifications besides using the toggle
   * Used primarily for the notification card button
   */
  const handleRequestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('Notifications API not available in this browser.');
      return;
    }
    setIsRequestingNotification(true);
    try {
      // Trigger system notification permission prompt
      await Notification.requestPermission();
      // Query the current permission state after the prompt
      const newStatus = await navigator.permissions.query({ name: 'notifications' });
      setPermissionsStatus(prevStatus => ({
        ...prevStatus,
        notifications: newStatus.state,
      }));
      // Set up a listener for future permission changes
      newStatus.onchange = () => { 
        setPermissionsStatus(prev => ({ ...prev, notifications: newStatus.state }));
      };
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
    setIsRequestingNotification(false);
  };

  const handleMapClick = (latlng: LatLng) => {
    if (isSelectingPickupMode) {
      setManualPickupLocation([latlng.lat, latlng.lng]);
      setIsSelectingPickupMode(false);
    }
  };

  const toggleSelectPickupMode = () => {
    setIsSelectingPickupMode(!isSelectingPickupMode);
  };

  const useCurrentLocationAsPickup = () => {
    if (currentLocation) {
      setManualPickupLocation(currentLocation);
      setIsSelectingPickupMode(false);
    }
  };

  const clearManualPickup = () => {
    setManualPickupLocation(null);
    setIsSelectingPickupMode(false);
  };
  
  const effectivePickupLocation = manualPickupLocation || currentLocation;

  const handleProceedToVehicleSelection = () => {
    if (effectivePickupLocation && destinationInput) {
      // Calculate a fixed distance between 5 and 54 km when pickup or destination changes
      const newDistance = Math.floor(Math.random() * 50) + 5; // Random distance between 5-54 km
      setTripDistance(newDistance);
      
      setTripParams({
        pickup: effectivePickupLocation,
        destination: destinationInput,
        radius: searchRadiusInput,
      });
      setSelectedVehicleClass(null);
      setCurrentView(HomePageView.VEHICLE_SELECTION);
    } else {
      alert('Please ensure a pickup location is set (current or manual) and a destination is entered.');
    }
  };

  const handleVehicleSelect = (vehicleClass: VehicleClass) => {
    setSelectedVehicleClass(vehicleClass);
  };

  const handleProceedToSearch = () => {
    if (tripParams && selectedVehicleClass) {
        console.log('Proceeding to search with:', { 
            ...tripParams,
            selectedVehicleClass 
        });
        setCurrentView(HomePageView.SEARCHING_FOR_DRIVER);
        setSearchAttempts(0);
        setIsSearching(true);
        setSearchStatusMessage(`Searching for a ${selectedVehicleClass.name} driver... Attempt 1`);
        // Simulate search
        simulateDriverSearch(1);
    } else {
        alert('Trip parameters or vehicle class not selected.');
    }
  };

  const simulateDriverSearch = (attempt: number) => {
    setSearchStatusMessage(`Finding ${selectedVehicleClass?.name}... Attempt ${attempt}`);
    setTimeout(() => {
      // Simulate finding a driver or not
      const driverFound = Math.random() > 0.33; // ~67% chance of finding a driver

      if (driverFound) {
        setIsSearching(false);
        const mockOffer: DriverOfferDetails = {
          driverName: 'John Doe',
          vehicleModel: `${selectedVehicleClass?.name || 'Standard'} - Toyota Camry`,
          vehicleLicensePlate: 'XYZ 123',
          etaMinutes: Math.floor(Math.random() * 10) + 5, // 5-14 minutes
          estimatedFare: 0, // Government mandated fares
        };
        setDriverOffer(mockOffer);
        setSearchStatusMessage(`${selectedVehicleClass?.name} found! Preparing...`);
        setCurrentView(HomePageView.DRIVER_OFFER);
      } else {
        if (attempt < 3) {
          setSearchAttempts(attempt + 1);
          simulateDriverSearch(attempt + 1);
        } else {
          setIsSearching(false);
          setSearchStatusMessage(`No ${selectedVehicleClass?.name} available. Try again or select different vehicle.`);
          // Allow user to go back or try again
        }
      }
    }, 3000); // Simulate 3-second search time per attempt
  };

  if (!isLoggedIn()) {
    return <p style={{ textAlign: 'center', marginTop: '50px', color: '#616161' }}>Redirecting to login...</p>;
  }

  const isNextDisabled = !effectivePickupLocation || !destinationInput.trim();

  const showPermissionWarning =
    (permissionsStatus.geolocation === 'denied' || (permissionsStatus.geolocation === 'prompt' && !currentLocation)) ||
    (permissionsStatus.notifications === 'denied'); 

  const showEnableNotificationsButton =
    permissionsStatus.notifications === 'prompt' || permissionsStatus.notifications === 'denied';

  const userLocationStatusText = useMemo(() => {
    if (locationError) return locationError;
    if (currentLocation) {
      return `Current Location`;
    }
    if (permissionsStatus.geolocation === 'prompt') return 'Awaiting permission...';
    return 'Fetching location...';
  }, [currentLocation, locationError, permissionsStatus.geolocation]);

  const manualPickupStatusText = useMemo(() => {
    if (manualPickupLocation) {
      const loc = L.latLng(manualPickupLocation);
      return `Pickup: ${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`;
    }
    return 'No pickup selected.';
  }, [manualPickupLocation]);

  if (currentView === HomePageView.VEHICLE_SELECTION) {
    if (!tripParams) {
        return (
            <div className="container animate-fade-in">
                <p className="text-center mt-lg">Something went wrong. Please try again.</p>
                <button 
                  onClick={() => setCurrentView(HomePageView.MAP_AND_DESTINATION)}
                  className="btn btn-primary mt-md"
                >
                  Go Back
                </button>
            </div>
        );
    }
    return (
      <div className="container animate-fade-in">
        <header className="flex justify-between items-center mb-sm">
          <h1 className="text-xl font-bold">Choose Ride</h1>
          <button 
            onClick={() => setCurrentView(HomePageView.MAP_AND_DESTINATION)} 
            className="btn btn-outline btn-sm"
          >
            Back
          </button>
        </header>
        
        {/* Vehicle Selection - Moved to top */}
        <section className="premium-section mb-sm">
          <h2 className="premium-section-title mb-sm">Select Vehicle Type</h2>
          <div className="premium-vehicle-list">
            {MOCK_VEHICLE_CLASSES.map((vc) => (
              <div 
                key={vc.id}
                onClick={() => handleVehicleSelect(vc)}
                className={`premium-vehicle-card ${selectedVehicleClass?.id === vc.id ? 'premium-vehicle-selected' : ''}`}
              >
                <div className="premium-vehicle-content">
                  <div className="premium-vehicle-icon">
                    <span className="material-icon">
                      {vc.id === 'auto' ? 'electric_rickshaw' : 
                       vc.id === 'economy' ? 'directions_car' : 
                       vc.id === 'premium' ? 'local_taxi' : 
                       vc.id === 'suv' ? 'directions_car' : 'airport_shuttle'}
                    </span>
                  </div>
                  <div className="premium-vehicle-info">
                    <h3 className="premium-vehicle-name">{vc.name}</h3>
                    <p className="premium-vehicle-description">{vc.id === 'auto' ? 'Quick, convenient' : 
                       vc.id === 'economy' ? 'Affordable rides' : 
                       vc.id === 'premium' ? 'Comfortable sedan' : 
                       'Larger vehicle'}</p>
                  </div>
                  <div className="premium-vehicle-price">
                    <span className="premium-price-amount">Govt. mandated fare</span>
                  </div>
                  {selectedVehicleClass?.id === vc.id && (
                    <div className="premium-vehicle-selected-indicator">
                      <span className="material-icon">check_circle</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
        
        {/* Trip Summary - Moved to bottom */}
        <div className="premium-trip-summary-card mb-sm">
          <div className="premium-compact-route">
            <div className="premium-route-point">
              <div className="premium-route-icon pickup">
                <span className="material-icon">my_location</span>
              </div>
              <div className="premium-route-text">
                <p className="premium-route-value">{tripParams.destination ? 'Your Location' : L.latLng(tripParams.pickup).toString()}</p>
              </div>
            </div>
            
            <div className="premium-route-connector" style={{height: '15px'}}></div>
            
            <div className="premium-route-point">
              <div className="premium-route-icon destination">
                <span className="material-icon">place</span>
              </div>
              <div className="premium-route-text">
                <p className="premium-route-value">{tripParams.destination}</p>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleProceedToSearch}
          disabled={!selectedVehicleClass}
          className={`premium-button ${!selectedVehicleClass ? 'premium-button-disabled' : ''}`}
        >
          <span className="premium-button-text">
            Find <span className="premium-button-icon material-icon">search</span>
          </span>
        </button>
      </div>
    );
  }

  if (currentView === HomePageView.SEARCHING_FOR_DRIVER) {
    return (
      <div className="container animate-fade-in">
        {/* Search Status */}
        <div className="premium-search-container">
          <header className="premium-search-header">
            <h1 className="premium-search-title">Finding</h1>
            <p className="premium-search-subtitle">Connecting drivers</p>
          </header>
          
          <div className="premium-search-card">
            {isSearching ? (
              <div className="premium-search-status searching">
                <div className="premium-search-animation">
                  <div className="premium-pulse-ring"></div>
                  <div className="premium-pulse-dot" style={{ backgroundColor: 'rgba(76, 175, 80, 0.1)' }}>
                    <span className="material-icon" style={{ color: '#4CAF50' }}>location_searching</span>
                  </div>
                </div>
                <h3 className="premium-search-message">{searchStatusMessage}</h3>
                <p className="premium-search-info">Under a minute</p>
              </div>
            ) : searchAttempts >= 3 ? (
              <div className="premium-search-status failed">
                <div className="premium-search-icon">
                  <span className="material-icon">sentiment_dissatisfied</span>
                </div>
                <h3 className="premium-search-message">{searchStatusMessage}</h3>
                <p className="premium-search-info">Try different vehicle</p>
              </div>
            ) : (
              <div className="premium-search-status">
                <div className="premium-search-icon">
                  <span className="material-icon">info</span>
                </div>
                <h3 className="premium-search-message">{searchStatusMessage}</h3>
              </div>
            )}
          </div>
          
          {/* Selected Vehicle */}
          {selectedVehicleClass && (
            <div className="premium-selected-vehicle">
              <div className="premium-selected-vehicle-icon">
                <span className="material-icon">
                  {selectedVehicleClass.id === 'auto' ? 'electric_rickshaw' : 
                   selectedVehicleClass.id === 'economy' ? 'directions_car' : 
                   selectedVehicleClass.id === 'premium' ? 'local_taxi' : 
                   selectedVehicleClass.id === 'suv' ? 'directions_car' : 'airport_shuttle'}
                </span>
              </div>
              <div className="premium-selected-vehicle-info">
                <h3 className="premium-selected-vehicle-name">{selectedVehicleClass.name}</h3>
                <p className="premium-selected-vehicle-price">Government mandated fares</p>
              </div>
            </div>
          )}
          
          {/* Action Buttons */}
          {!isSearching && (
            <div className="premium-search-actions">
              <button 
                onClick={() => setCurrentView(HomePageView.VEHICLE_SELECTION)}
                className="premium-btn premium-btn-secondary"
              >
                <span className="material-icon">arrow_back</span>
                <span>Change Ride</span>
              </button>
              <button 
                onClick={() => handleProceedToSearch()}
                className="premium-button"
              >
                <span className="premium-button-text">
                  Try Again <span className="premium-button-icon material-icon">refresh</span>
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (currentView === HomePageView.DRIVER_OFFER) {
    if (!driverOffer || !tripParams || !selectedVehicleClass) {
      return (
        <div className="container animate-fade-in">
          <div className="premium-error-state">
            <div className="premium-error-icon">
              <span className="material-icon">error_outline</span>
            </div>
            <h2 className="premium-error-title">Error</h2>
            <p className="premium-error-message">Offer not processed</p>
            <button 
              onClick={() => setCurrentView(HomePageView.VEHICLE_SELECTION)}
              className="premium-button mt-md"
            >
              <span className="premium-button-text">
                Try Again <span className="premium-button-icon material-icon">refresh</span>
              </span>
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="container animate-fade-in">
        <div className="premium-compact-card">
          <div className="premium-success-header">
            <div className="premium-success-icon">
              <span className="material-icon">check_circle</span>
            </div>
            <h2>Driver Found!</h2>
          </div>

          {/* Driver Info - Streamlined */}
          <div className="premium-driver-compact">
            <div className="premium-driver-avatar">
              <span className="material-icon">person</span>
            </div>
            <div className="premium-driver-details">
              <h3>{driverOffer.driverName}</h3>
              <div className="premium-vehicle-badge">
                <span className="material-icon">
                  {selectedVehicleClass && selectedVehicleClass.id === 'auto' ? 'electric_rickshaw' : 'directions_car'}
                </span>
                <span>{driverOffer.vehicleModel}</span>
                <span className="premium-license">{driverOffer.vehicleLicensePlate}</span>
              </div>
            </div>
            <div className="premium-eta">
              <span className="material-icon">schedule</span>
              <span>{driverOffer.etaMinutes} min</span>
            </div>
          </div>
          
          {/* Trip Details - Compact */}
          <div className="premium-compact-trip">
            {/* Route */}
            <div className="premium-compact-route">
              <div className="premium-route-point">
                <div className="premium-route-icon pickup">
                  <span className="material-icon">my_location</span>
                </div>
                <div className="premium-route-text">
                  <p className="premium-route-value">{tripParams.destination ? 'Your Location' : L.latLng(tripParams.pickup).toString().substring(0, 25) + '...'}</p>
                </div>
              </div>
              
              <div className="premium-route-connector" style={{height: '15px'}}></div>
              
              <div className="premium-route-point">
                <div className="premium-route-icon destination">
                  <span className="material-icon">place</span>
                </div>
                <div className="premium-route-text">
                  <p className="premium-route-value">{tripParams.destination}</p>
                </div>
              </div>
            </div>
            
            {/* Trip Info - Horizontal layout */}
            <div className="premium-trip-info-row">
              <div className="premium-trip-info-item">
                <span className="material-icon">category</span>
                <div>
                  <small>Type</small>
                  <p>{selectedVehicleClass?.name}</p>
                </div>
              </div>
              
              <div className="premium-trip-info-item">
                <span className="material-icon">route</span>
                <div>
                  <small>Trip Distance</small>
                  <p>{tripDistance || 17} km</p>
                </div>
              </div>
              
              <div className="premium-trip-info-item">
                <span className="material-icon">payments</span>
                <div>
                  <small>Fare</small>
                  <p>Government mandated fares</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="premium-action-buttons">
            <button 
              onClick={() => setCurrentView(HomePageView.VEHICLE_SELECTION)}
              className="premium-btn-cancel"
            >
              <span className="material-icon">close</span>
              <span>Cancel</span>
            </button>
            <button 
              onClick={() => {
                setCurrentView(HomePageView.TRIP_CONFIRMATION);
              }}
              className="premium-btn-confirm"
            >
              <span className="material-icon">check_circle</span>
              <span>Confirm</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentView === HomePageView.PROMISE2PAY) {
    return (
      <div className="container animate-fade-in">
        {/* Compact Header with Back Button */}
        <div className="compact-header">
          <button 
            onClick={() => setCurrentView(HomePageView.MAP_AND_DESTINATION)}
            className="back-button" 
            aria-label="Back"
          >
            <span className="material-icon">arrow_back</span>
          </button>
          <h1 className="compact-title">Promise2Pay</h1>
          <div className="header-spacer"></div>
        </div>
        
        <div className="compact-container">
          {/* Progress Card */}
          <div className="compact-card">
            <div className="progress-header">
              <div className="progress-title">Current Collection</div>
              <div className="progress-value">
                {promise2PayData.currentCollection.ridesCompleted} / {promise2PayData.currentCollection.totalRides} rides
              </div>
            </div>
            
            <div className="progress-bar-container">
              <div 
                className="progress-bar-fill" 
                style={{
                  width: `${(promise2PayData.currentCollection.ridesCompleted / promise2PayData.currentCollection.totalRides) * 100}%`
                }}
              ></div>
            </div>
            
            <p className="progress-info">
              <span className="bold">{promise2PayData.currentCollection.ridesRemaining} rides left</span> • ₹0.50 per ride
            </p>
          </div>
          
          {/* Options Card */}
          <div className="compact-card">
            <div className="card-section-title">Payment Options</div>
            
            {/* Standard Option */}
            <div className="option-row">
              <div className="option-icon">
                <span className="material-icon">calculate</span>
              </div>
              <div className="option-info">
                <div className="option-title">Standard</div>
                <div className="option-desc">
                  Every {promise2PayData.collectionOptions.standard.ridesPerCollection} rides • ₹0.50 per ride
                </div>
              </div>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={promise2PayData.collectionOptions.standard.active} 
                  onChange={() => {
                    setPromise2PayData(prev => ({
                      ...prev,
                      collectionOptions: {
                        ...prev.collectionOptions,
                        standard: {
                          ...prev.collectionOptions.standard,
                          active: true
                        },
                        monthly: {
                          ...prev.collectionOptions.monthly,
                          active: false
                        }
                      }
                    }));
                  }}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
            
            {/* Monthly Option */}
            <div className="option-row">
              <div className="option-icon">
                <span className="material-icon">calendar_month</span>
              </div>
              <div className="option-info">
                <div className="option-title">Monthly</div>
                <div className="option-desc">
                  Once per month
                </div>
              </div>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={promise2PayData.collectionOptions.monthly.active} 
                  onChange={() => {
                    setPromise2PayData(prev => ({
                      ...prev,
                      collectionOptions: {
                        ...prev.collectionOptions,
                        standard: {
                          ...prev.collectionOptions.standard,
                          active: false
                        },
                        monthly: {
                          ...prev.collectionOptions.monthly,
                          active: true
                        }
                      }
                    }));
                  }}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
          
          {/* History Card */}
          <div className="compact-card">
            <div className="card-section-title">Collection History</div>
            
            <div className="history-list">
              {promise2PayData.collectionHistory.map(collection => {
                const isCurrentCollection = collection.status === 'in-progress';
                return (
                  <div key={collection.id} className={`history-item ${isCurrentCollection ? 'current' : ''}`}>
                    <div className="history-status-indicator"></div>
                    <div className="history-content">
                      <div className="history-title">
                        {isCurrentCollection ? 'Current Progress' : 'Previous Collection'}
                      </div>
                      <div className="history-details">
                        <div className="history-date">
                          {collection.startDate} - {collection.endDate} • {collection.rides} rides
                        </div>
                        <div className="history-amount">
                          ₹0.50 per ride
                        </div>
                        {isCurrentCollection && (
                          <div className="history-estimate">
                            Due in {promise2PayData.currentCollection.ridesRemaining} more rides
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Action Button */}
          <button className="action-button">
            <span className="material-icon">payments</span>
            <span>Pay Now</span>
          </button>
        </div>
      </div>
    );
  }
  
  if (currentView === HomePageView.PAST_RIDES) {
    return (
      <div className="container animate-fade-in">
        {/* Compact Header */}
        <div className="compact-header">
          <button 
            onClick={() => setCurrentView(HomePageView.MAP_AND_DESTINATION)}
            className="back-button" 
            aria-label="Back"
          >
            <span className="material-icon">arrow_back</span>
          </button>
          <h1 className="compact-title">Past Rides</h1>
          <div className="header-spacer"></div>
        </div>
        
        {/* Past Rides List */}
        <div className="rides-container">
          {pastRides.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <span className="material-icon">directions_car_off</span>
              </div>
              <h2 className="empty-title">No rides yet</h2>
              <p className="empty-message">Your past rides will appear here</p>
              <button 
                onClick={() => setCurrentView(HomePageView.MAP_AND_DESTINATION)}
                className="action-button"
              >
                <span className="material-icon">add_circle</span>
                <span>Book a Ride</span>
              </button>
            </div>
          ) : (
            <>
              <div className="filter-tabs">
                <button className="filter-tab active">All</button>
                <button className="filter-tab">Completed</button>
                <button className="filter-tab">Cancelled</button>
              </div>
              
              <div className="ride-cards">
                {pastRides.map(ride => {
                  const rideDate = new Date(ride.date);
                  const formattedDate = rideDate.toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  });
                  const formattedTime = rideDate.toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  });
                  
                  return (
                    <div key={ride.id} className={`ride-card ${ride.status === 'cancelled' ? 'cancelled' : ''}`}>
                      {/* Card Header with Date/Time and Status */}
                      <div className="ride-header">
                        <div className="ride-datetime">
                          <span className="material-icon">event</span>
                          <span>{formattedDate} • {formattedTime}</span>
                        </div>
                        <div className={`ride-status ${ride.status.toLowerCase()}`}>
                          {ride.status === 'completed' ? 'Completed' : 'Cancelled'}
                        </div>
                      </div>
                      
                      {/* Compact Route */}
                      <div className="ride-route">
                        <div className="route-point">
                          <div className="point-marker pickup"></div>
                          <div className="point-text">{ride.pickup}</div>
                        </div>
                        <div className="route-divider"></div>
                        <div className="route-point">
                          <div className="point-marker dropoff"></div>
                          <div className="point-text">{ride.destination}</div>
                        </div>
                      </div>
                      
                      {/* Trip Info Row */}
                      <div className="ride-info-row">
                        <div className="driver-info">
                          <div className="driver-avatar">
                            <span className="material-icon">person</span>
                          </div>
                          <span className="driver-name">{ride.driverName}</span>
                        </div>
                        
                        <div className="ride-details">
                          <div className="detail-item">
                            <span className="material-icon">payments</span>
                            <span className="detail-text">₹(Govt. mandated fares)</span>
                          </div>
                          <div className="detail-item">
                            <span className="material-icon">directions_car</span>
                            <span className="detail-text">{ride.vehicleType}</span>
                          </div>
                          <div className="detail-item">
                            <span className="material-icon">straighten</span>
                            <span className="detail-text">{ride.distance} km</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      {/* <div className="ride-actions">
                        <button className="action-btn secondary">
                          <span className="material-icon">receipt_long</span>
                          <span>Receipt</span>
                        </button>
                        
                        <button className="action-btn secondary">
                          <span className="material-icon">support_agent</span>
                          <span>Help</span>
                        </button>
                        
                        <button className="action-btn primary">
                          <span className="material-icon">repeat</span>
                          <span>Book Again</span>
                        </button>
                      </div> */}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }
  
  if (currentView === HomePageView.SETTINGS) {
    return (
      <div className="container animate-fade-in">
        {/* Header */}
        <header className="premium-header">
          <button 
            onClick={() => setCurrentView(HomePageView.MAP_AND_DESTINATION)}
            className="premium-icon-btn" 
            aria-label="Back"
          >
            <span className="material-icon">arrow_back</span>
          </button>
          <h1 className="premium-page-title">Settings</h1>
        </header>
        
        {/* Settings Content */}
        <div className="premium-settings-container">
          {/* Notification Settings */}
          <section className="premium-settings-section">
            <h2 className="premium-section-title">Notifications</h2>
            <div className="premium-settings-group">
              <div className="premium-setting-item">
                <div className="premium-setting-info">
                  <span className="premium-setting-icon material-icon">notifications</span>
                  <div className="premium-setting-text">
                    <h3 className="premium-setting-title">Ride Updates</h3>
                    <p className="premium-setting-description">Get notified about your ride status</p>
                  </div>
                </div>
                <label className="premium-toggle">
                  <input 
                    type="checkbox" 
                    checked={userSettings.notifications.rideUpdates}
                    onChange={(e) => setUserSettings(prev => ({
                      ...prev,
                      notifications: {
                        ...prev.notifications,
                        rideUpdates: e.target.checked
                      }
                    }))}
                  />
                  <span className="premium-toggle-slider"></span>
                </label>
              </div>
              
              <div className="premium-setting-item">
                <div className="premium-setting-info">
                  <span className="premium-setting-icon material-icon">local_offer</span>
                  <div className="premium-setting-text">
                    <h3 className="premium-setting-title">Promotions</h3>
                    <p className="premium-setting-description">Receive offers and discounts</p>
                  </div>
                </div>
                <label className="premium-toggle">
                  <input 
                    type="checkbox" 
                    checked={userSettings.notifications.promotions}
                    onChange={(e) => setUserSettings(prev => ({
                      ...prev,
                      notifications: {
                        ...prev.notifications,
                        promotions: e.target.checked
                      }
                    }))}
                  />
                  <span className="premium-toggle-slider"></span>
                </label>
              </div>
              
              <div className="premium-setting-item">
                <div className="premium-setting-info">
                  <span className="premium-setting-icon material-icon">account_circle</span>
                  <div className="premium-setting-text">
                    <h3 className="premium-setting-title">Account Activity</h3>
                    <p className="premium-setting-description">Stay informed about account changes</p>
                  </div>
                </div>
                <label className="premium-toggle">
                  <input 
                    type="checkbox" 
                    checked={userSettings.notifications.accountActivity}
                    onChange={(e) => setUserSettings(prev => ({
                      ...prev,
                      notifications: {
                        ...prev.notifications,
                        accountActivity: e.target.checked
                      }
                    }))}
                  />
                  <span className="premium-toggle-slider"></span>
                </label>
              </div>
            </div>
          </section>
          
          {/* Payment Settings */}
          <section className="premium-settings-section">
            <h2 className="premium-section-title">Payment Methods</h2>
            <div className="premium-settings-group">
              <div className="premium-setting-item">
                <div className="premium-setting-info">
                  <span className="premium-setting-icon material-icon">credit_card</span>
                  <div className="premium-setting-text">
                    <h3 className="premium-setting-title">Default Payment</h3>
                    <p className="premium-setting-description">Select your preferred payment method</p>
                  </div>
                </div>
                <select 
                  className="premium-select"
                  value={userSettings.paymentMethods.default}
                  onChange={(e) => setUserSettings(prev => ({
                    ...prev,
                    paymentMethods: {
                      ...prev.paymentMethods,
                      default: e.target.value
                    }
                  }))}
                >
                  <option value="UPI">UPI</option>
                  <option value="Card">Credit/Debit Card</option>
                  <option value="Cash">Cash</option>
                  <option value="Wallet">Wallet</option>
                </select>
              </div>
            </div>
          </section>
          
          {/* Preferences Settings */}
          <section className="premium-settings-section">
            <h2 className="premium-section-title">Preferences</h2>
            <div className="premium-settings-group">
              <div className="premium-setting-item">
                <div className="premium-setting-info">
                  <span className="premium-setting-icon material-icon">dark_mode</span>
                  <div className="premium-setting-text">
                    <h3 className="premium-setting-title">Dark Mode</h3>
                    <p className="premium-setting-description">Toggle dark theme</p>
                  </div>
                </div>
                <label className="premium-toggle">
                  <input 
                    type="checkbox" 
                    checked={userSettings.preferences.darkMode}
                    onChange={(e) => setUserSettings(prev => ({
                      ...prev,
                      preferences: {
                        ...prev.preferences,
                        darkMode: e.target.checked
                      }
                    }))}
                  />
                  <span className="premium-toggle-slider"></span>
                </label>
              </div>
              
              <div className="premium-setting-item">
                <div className="premium-setting-info">
                  <span className="premium-setting-icon material-icon">language</span>
                  <div className="premium-setting-text">
                    <h3 className="premium-setting-title">Language</h3>
                    <p className="premium-setting-description">Choose your preferred language</p>
                  </div>
                </div>
                <select 
                  className="premium-select"
                  value={userSettings.preferences.language}
                  onChange={(e) => setUserSettings(prev => ({
                    ...prev,
                    preferences: {
                      ...prev.preferences,
                      language: e.target.value
                    }
                  }))}
                >
                  <option value="English">English</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Kannada">Kannada</option>
                  <option value="Tamil">Tamil</option>
                  <option value="Telugu">Telugu</option>
                </select>
              </div>
              
              <div className="premium-setting-item">
                <div className="premium-setting-info">
                  <span className="premium-setting-icon material-icon">currency_rupee</span>
                  <div className="premium-setting-text">
                    <h3 className="premium-setting-title">Currency</h3>
                    <p className="premium-setting-description">Set your preferred currency</p>
                  </div>
                </div>
                <select 
                  className="premium-select"
                  value={userSettings.preferences.currency}
                  onChange={(e) => setUserSettings(prev => ({
                    ...prev,
                    preferences: {
                      ...prev.preferences,
                      currency: e.target.value
                    }
                  }))}
                >
                  <option value="INR">Indian Rupee (₹)</option>
                  <option value="USD">US Dollar ($)</option>
                  <option value="EUR">Euro (€)</option>
                </select>
              </div>
            </div>
          </section>
          
          {/* Save Button */}
          <button 
            onClick={() => {
              alert('Settings saved successfully!');
              setCurrentView(HomePageView.MAP_AND_DESTINATION);
            }}
            className="premium-button mt-lg"
          >
            <span className="premium-button-text">
              Save Settings <span className="premium-button-icon material-icon">save</span>
            </span>
          </button>
        </div>
      </div>
    );
  }
  
  if (currentView === HomePageView.TRIP_CONFIRMATION) {
    if (!tripParams || !selectedVehicleClass || !driverOffer) {
      return (
        <div className="container animate-fade-in">
          <div className="premium-error-state">
            <div className="premium-error-icon">
              <span className="material-icon">error_outline</span>
            </div>
            <h2 className="premium-error-title">Something went wrong</h2>
            <p className="premium-error-message">We couldn't process your trip confirmation</p>
            <button 
              onClick={() => setCurrentView(HomePageView.MAP_AND_DESTINATION)}
              className="premium-button mt-md"
            >
              <span className="premium-button-text">
                Start Over <span className="premium-button-icon material-icon">refresh</span>
              </span>
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="container animate-fade-in">
        <div className="premium-compact-card">
          {/* Success Header */}
          <div className="premium-success-header">
            <div className="premium-success-icon confirm">
              <span className="material-icon">check_circle</span>
            </div>
            <h2>Ride Confirmed</h2>
            <p className="premium-success-subtitle">Your driver is on the way</p>
          </div>
          
          {/* Driver Info - Compact */}
          <div className="premium-driver-details-card">
            <div className="premium-driver-compact">
              <div className="premium-driver-avatar">
                <span className="material-icon">person</span>
              </div>
              <div className="premium-driver-details">
                <h3>{driverOffer.driverName}</h3>
                <div className="premium-vehicle-badge">
                  <span className="material-icon">
                    {selectedVehicleClass && selectedVehicleClass.id === 'auto' ? 'electric_rickshaw' : 'directions_car'}
                  </span>
                  <span>{driverOffer.vehicleModel}</span>
                  <span className="premium-license">{driverOffer.vehicleLicensePlate}</span>
                </div>
              </div>
              <div className="premium-eta confirm">
                <span className="material-icon">schedule</span>
                <span>Arriving in {driverOffer.etaMinutes} min</span>
              </div>
            </div>
            <button 
              onClick={() => alert('Contact Driver feature coming soon!')}
              className="premium-contact-button"
            >
              <span className="material-icon">phone</span>
              <span>Contact</span>
            </button>
          </div>
          
          {/* Trip Details - Horizontal Layout */}
          <div className="premium-trip-info-box">
            <div className="premium-trip-info-row">
              <div className="premium-trip-info-item">
                <span className="material-icon">payments</span>
                <div>
                  <small>Fare</small>
                  <p>Government mandated fares</p>
                </div>
              </div>
              
              <div className="premium-trip-info-item">
                <span className="material-icon">route</span>
                <div>
                  <small>Distance</small>
                  <p>{tripDistance || 17} km</p>
                </div>
              </div>
              
              <div className="premium-trip-info-item">
                <span className="material-icon">timer</span>
                <div>
                  <small>Duration</small>
                  <p>15-25 min</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Route Details */}
          <div className="premium-route-box">
            <div className="premium-route-point">
              <div className="premium-route-icon pickup">
                <span className="material-icon">my_location</span>
              </div>
              <div className="premium-route-text">
                <small>Pickup</small>
                <p>{tripParams.destination ? 'Your Location' : L.latLng(tripParams.pickup).toString().substring(0, 25) + '...'}</p>
              </div>
            </div>
            
            <div className="premium-route-connector" style={{height: '15px'}}></div>
            
            <div className="premium-route-point">
              <div className="premium-route-icon destination">
                <span className="material-icon">place</span>
              </div>
              <div className="premium-route-text">
                <small>Destination</small>
                <p>{tripParams.destination}</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Book Again Button */}
        <button 
          onClick={() => {
            setTripParams(null);
            setSelectedVehicleClass(null);
            setDriverOffer(null);
            setSearchAttempts(0);
            setSearchStatusMessage('');
            setCurrentView(HomePageView.MAP_AND_DESTINATION);
          }}
          className="premium-book-again-btn"
        >
          <span className="material-icon">add_circle</span>
          <span>Book Again</span>
        </button>
      </div>
    );
  }

  return (
    <div className="container">
      {/* For permissions management */}
      <PermissionsManager onPermissionsUpdate={handlePermissionsUpdate} />
      <MicroInteractions />
      
      {/* Header */}
      <header className="premium-header">
        <h1 className="brand-logo">Y A B N A <span className="brand-accent">.</span></h1>
        <div className="premium-menu-container">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)} 
            className="premium-icon-btn" 
            aria-label="Menu"
          >
            <span className="material-icon">{isMenuOpen ? 'close' : 'menu'}</span>
          </button>
          
          {isMenuOpen && (
            <div className="premium-menu-dropdown">
              <div className="premium-menu-items">
                <button 
                  onClick={() => handleMenuItemClick('Past Rides')} 
                  className="premium-menu-item"
                >
                  <span className="material-icon">history</span>
                  <span>Past Rides</span>
                </button>
                <button 
                  onClick={() => handleMenuItemClick('Promise2Pay')} 
                  className="premium-menu-item"
                >
                  <span className="material-icon">payments</span>
                  <span>Promise2Pay</span>
                </button>
                <button 
                  onClick={() => handleMenuItemClick('Settings')} 
                  className="premium-menu-item"
                >
                  <span className="material-icon">settings</span>
                  <span>Settings</span>
                </button>
                <div className="premium-menu-divider"></div>
                <button onClick={handleLogout} className="premium-menu-item premium-menu-item-logout">
                  <span className="material-icon">logout</span>
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </header>
      
      {/* Permission toggles aligned with UI elements */}
      {/* Permission toggles component - shows always-visible toggles for location and notifications */}
      {/* Passes UI state flags to control opacity and passes callback for toggle interaction */}
      <PermissionToggles 
        isSelectingPickupMode={isSelectingPickupMode}
        isMenuOpen={isMenuOpen}
        onPermissionChange={handlePermissionToggle}
      />

      {/* SOURCE AND DESTINATION SECTION - RANK 1 */}
      {/* Pickup Controls - Source */}
      <section className="premium-section">
        <h3 className="premium-section-title">Pickup</h3>
        <div className="premium-card">
          <div className="premium-card-content">
            <div className="premium-option-group">
              {/* Map Selection Button */}
              <button 
                onClick={toggleSelectPickupMode} 
                className={`premium-option-btn ${isSelectingPickupMode ? 'premium-option-active' : ''}`}
              >
                <span className="premium-option-icon material-icon">{isSelectingPickupMode ? 'close' : 'map'}</span>
                <div className="premium-option-text">
                  <span className="premium-option-label">{isSelectingPickupMode ? 'Cancel' : 'Select On Map'}</span>
                </div>
              </button>
              
              {/* Current Location Button */}
              <button 
                onClick={useCurrentLocationAsPickup} 
                disabled={!currentLocation} 
                className="premium-option-btn"
              >
                <span className="premium-option-icon material-icon">gps_fixed</span>
                <div className="premium-option-text">
                  <span className="premium-option-label">Current Location</span>
                </div>
              </button>
              
              {/* Clear Button - Only show if location is set */}
              {manualPickupLocation && (
                <button 
                  onClick={clearManualPickup} 
                  className="premium-option-btn premium-option-secondary"
                >
                  <span className="premium-option-icon material-icon">location_off</span>
                  <div className="premium-option-text">
                    <span className="premium-option-label">Clear</span>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Location Status */}
        <div className="premium-location-status">
          {userLocationStatusText && (
            <div className="premium-status-item">
              <span className="premium-status-icon material-icon">my_location</span>
              <span className="premium-status-text">{userLocationStatusText}</span>
            </div>
          )}
          {manualPickupStatusText && (
            <div className="premium-status-item pickup-status">
              <span className="premium-status-icon material-icon">place</span>
              <span className="premium-status-text">{manualPickupStatusText}</span>
            </div>
          )}
        </div>
      </section>

      {/* Destination Input */}
      <section className="premium-section">
        <div className="premium-section-row">
          <h3 className="premium-section-title">Destination</h3>
          <div className="premium-card">
            <div className="premium-card-content">
              <div className="premium-input-group">
                <span className="premium-input-icon material-icon">place</span>
                <div className="premium-input-wrapper">
                  <input
                    type="text"
                    id="destination"
                    value={destinationInput} 
                    onChange={(e) => setDestinationInput(e.target.value)} 
                    placeholder="Enter destination"
                    className="premium-input"
                  />
                  <label htmlFor="destination" className="premium-input-label">Destination</label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MAP DISPLAY - RANK 2 */}
      <section className="premium-section">
        <h3 className="premium-section-title">Map</h3>
        <div className={`premium-map-container ${isSelectingPickupMode ? 'selecting-mode' : ''}`}>
          <MapDisplay 
            userPosition={currentLocation} 
            pickupPosition={manualPickupLocation}
            userLocationText={currentLocation ? (() => { const loc = L.latLng(currentLocation); return `${loc.lat.toFixed(6)}, ${loc.lng.toFixed(6)}`; })() : 'Awaiting location data...'} 
            onMapClick={handleMapClick}
            isSelectingPickup={isSelectingPickupMode}
          />
          
          {/* Map Status Overlay */}
          {isSelectingPickupMode && (
            <div className="premium-map-overlay">
              <span className="material-icon">location_on</span>
              <div className="premium-map-overlay-text">
                <strong>Set Pickup Location</strong>
                <p>Tap on map to select</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* CONTINUE BUTTON - RANK 1 */}
      {/* Next Button Section */}
      <section className="premium-section">
        <button 
          onClick={handleProceedToVehicleSelection} 
          disabled={isNextDisabled}
          className={`premium-button ${isNextDisabled ? 'premium-button-disabled' : ''}`}
        >
          <span className="premium-button-text">
            Continue <span className="premium-button-icon material-icon">arrow_forward</span>
          </span>
        </button>
      </section>

      {/* PERMISSION WARNINGS - RANK 3 (CONTEXTUAL) */}
      {showPermissionWarning && (
        <div className="premium-alert mb-md animate-fade-in">
          <div className="premium-alert-content">
            <span className="premium-alert-icon material-icon">priority_high</span>
            <div className="premium-alert-text">
              <h4 className="premium-alert-title">Attention</h4>
              <p className="premium-alert-message">
                {permissionsStatus.geolocation === 'denied' && "Location access needed for service."}
                {(permissionsStatus.geolocation === 'prompt' && !currentLocation) && "Allow location when prompted."}
                {permissionsStatus.geolocation === 'denied' && permissionsStatus.notifications === 'denied' && <span className="premium-separator"></span>}
                {permissionsStatus.notifications === 'denied' && "Enable for ride updates."}
              </p>
            </div>
          </div>
        </div>
      )}

      {showEnableNotificationsButton && (
        <div className="premium-card mb-md animate-fade-in">
          <div className="premium-card-content">
            <div className="premium-card-row">
              <span className="premium-card-icon material-icon">notifications</span>
              <div className="premium-card-text">
                <h3 className="premium-card-title">Stay Updated</h3>
                <p className="premium-card-description">Get ride alerts</p>
              </div>
              <button 
                onClick={handleRequestNotificationPermission} 
                disabled={isRequestingNotification || permissionsStatus.notifications === 'granted'}
                className={`premium-btn ${(permissionsStatus.notifications === 'granted') ? 'premium-btn-success' : 'premium-btn-primary'}`}
              >
                {isRequestingNotification ? 'Processing...' : (permissionsStatus.notifications === 'granted' ? 'Enabled' : 'Enable Notifications')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
