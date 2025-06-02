"use client";

import { useEffect, useState, useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import L, { LatLngExpression, LatLng } from 'leaflet'; 
import { isLoggedIn, clearRiderSession } from '../utils/auth';
import PermissionsManager from '../components/PermissionsManager';
import VehicleClassCard, { VehicleClass } from '../components/VehicleClassCard';
import MicroInteractions from '../components/MicroInteractions';

const MapDisplay = dynamic(() => import('../components/MapDisplay'), {
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
  const router = useRouter();
  const [currentView, setCurrentView] = useState<HomePageView>(HomePageView.MAP_AND_DESTINATION);
  const [tripParams, setTripParams] = useState<TripParameters | null>(null);
  const [selectedVehicleClass, setSelectedVehicleClass] = useState<VehicleClass | null>(null);
  const [searchAttempts, setSearchAttempts] = useState<number>(0);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchStatusMessage, setSearchStatusMessage] = useState<string>('');
  const [driverOffer, setDriverOffer] = useState<DriverOfferDetails | null>(null);

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

  useEffect(() => {
    if (permissionsStatus.geolocation === 'granted') {
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
    } else if (permissionsStatus.geolocation === 'denied') {
      setLocationError('Geolocation permission denied. Cannot display current location.');
      setCurrentLocation(null);
    } else if (permissionsStatus.geolocation === 'prompt'){
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

  const handlePermissionsUpdate = (status: AppPermissionsStatus) => {
    setPermissionsStatus(status);
    console.log('Permissions updated in HomePage:', status);
  };

  const handleRequestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('Notifications API not available in this browser.');
      return;
    }
    setIsRequestingNotification(true);
    try {
      await Notification.requestPermission();
      const newStatus = await navigator.permissions.query({ name: 'notifications' });
      setPermissionsStatus(prevStatus => ({
        ...prevStatus,
        notifications: newStatus.state,
      }));
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
    setSearchStatusMessage(`Searching for a ${selectedVehicleClass?.name} driver... Attempt ${attempt}`);
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
          estimatedFare: selectedVehicleClass ? (tripDistance || 20) * selectedVehicleClass.pricePerKm : 20,
        };
        setDriverOffer(mockOffer);
        setSearchStatusMessage(`Driver found for ${selectedVehicleClass?.name}! Preparing offer...`);
        setCurrentView(HomePageView.DRIVER_OFFER);
      } else {
        if (attempt < 3) {
          setSearchAttempts(attempt + 1);
          simulateDriverSearch(attempt + 1);
        } else {
          setIsSearching(false);
          setSearchStatusMessage(`No ${selectedVehicleClass?.name} drivers found after 3 attempts. Please try again later or select a different vehicle.`);
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
      return `Your Current Location`;
    }
    if (permissionsStatus.geolocation === 'prompt') return 'Awaiting location permission...';
    return 'Trying to fetch your location...';
  }, [currentLocation, locationError, permissionsStatus.geolocation]);

  const manualPickupStatusText = useMemo(() => {
    if (manualPickupLocation) {
      const loc = L.latLng(manualPickupLocation);
      return `Selected Pickup: Lat ${loc.lat.toFixed(4)}, Lng ${loc.lng.toFixed(4)}`;
    }
    return 'No manual pickup location selected.';
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
        <header className="flex justify-between items-center mb-md">
          <h1 className="text-xl font-bold">Choose ride</h1>
          <button 
            onClick={() => setCurrentView(HomePageView.MAP_AND_DESTINATION)} 
            className="btn btn-outline btn-sm"
          >
            Back
          </button>
        </header>
        
        {/* Trip Summary */}
        <div className="premium-trip-summary-card">
          <h3 className="premium-section-title">Trip Summary</h3>
          <div className="premium-route-details">
            <div className="premium-route-point">
              <div className="premium-route-icon pickup">
                <span className="material-icon">my_location</span>
              </div>
              <div className="premium-route-text">
                <h4 className="premium-route-label">Pickup Location</h4>
                <p className="premium-route-value">{L.latLng(tripParams.pickup).toString()}</p>
              </div>
            </div>
            
            <div className="premium-route-connector"></div>
            
            <div className="premium-route-point">
              <div className="premium-route-icon destination">
                <span className="material-icon">place</span>
              </div>
              <div className="premium-route-text">
                <h4 className="premium-route-label">Destination</h4>
                <p className="premium-route-value">{tripParams.destination}</p>
              </div>
            </div>
          </div>
          
          <div className="premium-trip-parameter">
            <div className="premium-parameter-icon">
              <span className="material-icon">radar</span>
            </div>
            <div className="premium-parameter-text">
              <h4 className="premium-parameter-label">Search Radius</h4>
              <p className="premium-parameter-value">{(tripParams.radius/1000).toFixed(1)} km</p>
            </div>
          </div>
        </div>
        
        {/* Vehicle Selection */}
        <section className="premium-section">
          <h2 className="premium-section-title">Select Your Ride</h2>
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
                    <p className="premium-vehicle-description">{vc.description}</p>
                  </div>
                  <div className="premium-vehicle-price">
                    <span className="premium-price-amount">₹{(vc.pricePerKm * (tripDistance || 20)).toFixed(0)}</span>
                    <span className="premium-price-unit">estimated total</span>
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
          <button
            onClick={handleProceedToSearch}
            disabled={!selectedVehicleClass}
            className={`premium-button ${!selectedVehicleClass ? 'premium-button-disabled' : ''} mt-md`}
          >
            <span className="premium-button-text">
              Find Your Driver <span className="premium-button-icon material-icon">search</span>
            </span>
          </button>
        </section>
      </div>
    );
  }

  if (currentView === HomePageView.SEARCHING_FOR_DRIVER) {
    return (
      <div className="container animate-fade-in">
        {/* Search Status */}
        <div className="premium-search-container">
          <header className="premium-search-header">
            <h1 className="premium-search-title">Finding Your Ride</h1>
            <p className="premium-search-subtitle">Connecting you with the best drivers</p>
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
                <p className="premium-search-info">This usually takes less than a minute</p>
              </div>
            ) : searchAttempts >= 3 ? (
              <div className="premium-search-status failed">
                <div className="premium-search-icon">
                  <span className="material-icon">sentiment_dissatisfied</span>
                </div>
                <h3 className="premium-search-message">{searchStatusMessage}</h3>
                <p className="premium-search-info">Try a different vehicle type or search area</p>
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
                <p className="premium-selected-vehicle-price">₹{(selectedVehicleClass.pricePerKm * (tripDistance || 20)).toFixed(0)} estimated total</p>
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
                <span>Choose Different Ride</span>
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
            <h2 className="premium-error-title">Something went wrong</h2>
            <p className="premium-error-message">We couldn't process your ride offer</p>
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
        <header className="premium-offer-header">
          <div className="premium-offer-icon">
            <span className="material-icon">check_circle</span>
          </div>
          <h1 className="premium-offer-title">Driver Found!</h1>
          <p className="premium-offer-subtitle">Review and confirm your ride</p>
        </header>
        
        {/* Driver Card */}
        <div className="premium-driver-offer-card">
          {/* Driver Info */}
          <div className="premium-driver-offer-header">
            <div className="premium-driver-profile">
              <div className="premium-driver-avatar">
                <span className="material-icon">person</span>
              </div>
              <div className="premium-driver-info">
                <h3 className="premium-driver-name">{driverOffer.driverName}</h3>
                <div className="premium-vehicle-info">
                  <span className="material-icon">directions_car</span>
                  <span className="premium-vehicle-model">{driverOffer.vehicleModel}</span>
                  <span className="premium-license-plate">{driverOffer.vehicleLicensePlate}</span>
                </div>
              </div>
            </div>
            <div className="premium-eta-badge">
              <span className="material-icon">schedule</span>
              <span>Arrives in {driverOffer.etaMinutes} min</span>
            </div>
          </div>
          
          {/* Trip Details */}
          <div className="premium-offer-trip-details">
            <h3 className="premium-section-title">Trip Details</h3>
            
            <div className="premium-route-details">
              <div className="premium-route-point">
                <div className="premium-route-icon pickup">
                  <span className="material-icon">my_location</span>
                </div>
                <div className="premium-route-text">
                  <h4 className="premium-route-label">Pickup Location</h4>
                  <p className="premium-route-value">{L.latLng(tripParams.pickup).toString()}</p>
                </div>
              </div>
              
              <div className="premium-route-connector"></div>
              
              <div className="premium-route-point">
                <div className="premium-route-icon destination">
                  <span className="material-icon">place</span>
                </div>
                <div className="premium-route-text">
                  <h4 className="premium-route-label">Destination</h4>
                  <p className="premium-route-value">{tripParams.destination}</p>
                </div>
              </div>
            </div>
            
            <div className="premium-trip-info-grid">
              <div className="premium-trip-info-card">
                <div className="premium-trip-info-icon">
                  <span className="material-icon">category</span>
                </div>
                <div className="premium-trip-info-content">
                  <h4 className="premium-trip-info-label">Ride Type</h4>
                  <p className="premium-trip-info-value">{selectedVehicleClass.name}</p>
                </div>
              </div>
              
              <div className="premium-trip-info-card">
                <div className="premium-trip-info-icon">
                  <span className="material-icon">route</span>
                </div>
                <div className="premium-trip-info-content">
                  <h4 className="premium-trip-info-label">Trip Distance</h4>
                  <p className="premium-trip-info-value">{tripDistance || 20} km</p>
                </div>
              </div>
              
              <div className="premium-trip-info-card">
                <div className="premium-trip-info-icon">
                  <span className="material-icon">payments</span>
                </div>
                <div className="premium-trip-info-content">
                  <h4 className="premium-trip-info-label">Estimated Fare</h4>
                  <p className="premium-trip-info-value">₹{driverOffer.estimatedFare.toFixed(0)}</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Buttons */}
          <div className="premium-offer-actions">
            <button 
              onClick={() => setCurrentView(HomePageView.VEHICLE_SELECTION)}
              className="premium-btn premium-btn-secondary"
            >
              <span className="material-icon">close</span>
              <span>Cancel</span>
            </button>
            <button 
              onClick={() => {
                // Skip the confirmation screen entirely and go straight to the confirmed state
                setCurrentView(HomePageView.TRIP_CONFIRMATION);
              }}
              className="premium-button"
            >
              <span className="premium-button-text">
                Confirm Ride <span className="premium-button-icon material-icon">check_circle</span>
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentView === HomePageView.PROMISE2PAY) {
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
          <h1 className="premium-page-title">Promise2Pay</h1>
        </header>
        
        <div className="premium-p2p-container">
          <p className="premium-p2p-subtitle">Pay once after completing multiple rides</p>
          
          {/* Current Collection Status */}
          <div className="premium-p2p-card">
            <h3 className="premium-p2p-section-title">Current Collection Status</h3>
            
            <div className="premium-p2p-progress-container">
              <h2 className="premium-p2p-progress-text">
                {promise2PayData.currentCollection.ridesCompleted} / {promise2PayData.currentCollection.totalRides} rides
              </h2>
              
              <div className="premium-p2p-progress-bar">
                <div 
                  className="premium-p2p-progress-fill" 
                  style={{
                    width: `${(promise2PayData.currentCollection.ridesCompleted / promise2PayData.currentCollection.totalRides) * 100}%`
                  }}
                ></div>
              </div>
              
              <p className="premium-p2p-progress-info">
                {promise2PayData.currentCollection.ridesRemaining} more rides until collection (₹{(promise2PayData.currentCollection.totalAmount / 100).toFixed(2)} total)
              </p>
            </div>
          </div>
          
          {/* Collection Options */}
          <div className="premium-p2p-card">
            <h3 className="premium-p2p-section-title">Collection Options</h3>
            
            <div className="premium-p2p-option-container">
              <div className="premium-p2p-option">
                <div className="premium-p2p-option-icon">
                  <span className="material-icon">calculate</span>
                </div>
                <div className="premium-p2p-option-info">
                  <h4 className="premium-p2p-option-title">Standard Collection (Active)</h4>
                  <p className="premium-p2p-option-desc">
                    Collect after every {promise2PayData.collectionOptions.standard.ridesPerCollection} rides (₹{(promise2PayData.collectionOptions.standard.ratePerRide / 100).toFixed(2)} per ride)
                  </p>
                </div>
                <div className="premium-p2p-option-toggle">
                  <label className="premium-toggle">
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
                    <span className="premium-toggle-slider"></span>
                  </label>
                </div>
              </div>
              
              <div className="premium-p2p-option">
                <div className="premium-p2p-option-icon">
                  <span className="material-icon">calendar_month</span>
                </div>
                <div className="premium-p2p-option-info">
                  <h4 className="premium-p2p-option-title">Monthly Collection</h4>
                  <p className="premium-p2p-option-desc">
                    Collect once a month regardless of ride count
                  </p>
                </div>
                <div className="premium-p2p-option-toggle">
                  <label className="premium-toggle">
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
                    <span className="premium-toggle-slider"></span>
                  </label>
                </div>
              </div>
            </div>
          </div>
          
          {/* Collection History */}
          <div className="premium-p2p-card">
            <h3 className="premium-p2p-section-title">Collection History</h3>
            
            <div className="premium-p2p-history-container">
              {promise2PayData.collectionHistory.map(collection => {
                const isCurrentCollection = collection.status === 'in-progress';
                return (
                  <div key={collection.id} className="premium-p2p-history-item">
                    <div className="premium-p2p-history-info">
                      <h4 className="premium-p2p-history-title">
                        {isCurrentCollection ? 'Current Collection Progress' : 'Previous 20-Ride Collection'}
                      </h4>
                      <p className="premium-p2p-history-date">
                        {collection.startDate} - {collection.endDate} ({collection.rides} rides)
                      </p>
                      <p className="premium-p2p-history-amount">
                        ₹{(collection.amount / 100).toFixed(2)}
                      </p>
                      {isCurrentCollection && (
                        <p className="premium-p2p-history-estimate">
                          Estimated collection in {promise2PayData.currentCollection.ridesRemaining} more rides
                          <br />
                          ₹{(promise2PayData.currentCollection.totalAmount / 100).toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Pay Now Button */}
          <button className="premium-p2p-pay-button">
            Pay Now
          </button>
        </div>
      </div>
    );
  }
  
  if (currentView === HomePageView.PAST_RIDES) {
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
          <h1 className="premium-page-title">Past Rides</h1>
        </header>
        
        {/* Past Rides List */}
        <div className="premium-past-rides-container">
          {pastRides.length === 0 ? (
            <div className="premium-empty-state">
              <div className="premium-empty-icon">
                <span className="material-icon">directions_car_off</span>
              </div>
              <h2 className="premium-empty-title">No rides yet</h2>
              <p className="premium-empty-message">Your past rides will appear here</p>
              <button 
                onClick={() => setCurrentView(HomePageView.MAP_AND_DESTINATION)}
                className="premium-button mt-md"
              >
                <span className="premium-button-text">
                  Book a Ride <span className="premium-button-icon material-icon">add_circle</span>
                </span>
              </button>
            </div>
          ) : (
            <>
              <div className="premium-ride-filters">
                <button className="premium-filter-btn premium-filter-active">All</button>
                <button className="premium-filter-btn">Completed</button>
                <button className="premium-filter-btn">Cancelled</button>
              </div>
              
              <div className="premium-rides-list">
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
                    <div key={ride.id} className={`premium-ride-card ${ride.status === 'cancelled' ? 'premium-ride-cancelled' : ''}`}>
                      <div className="premium-ride-header">
                        <div className="premium-ride-date">
                          <span className="material-icon">event</span>
                          <span>{formattedDate} • {formattedTime}</span>
                        </div>
                        <div className={`premium-ride-status ${ride.status === 'completed' ? 'premium-status-completed' : 'premium-status-cancelled'}`}>
                          <span className="material-icon">
                            {ride.status === 'completed' ? 'check_circle' : 'cancel'}
                          </span>
                          <span>{ride.status === 'completed' ? 'Completed' : 'Cancelled'}</span>
                        </div>
                      </div>
                      
                      <div className="premium-ride-route">
                        <div className="premium-route-point">
                          <div className="premium-route-icon pickup">
                            <span className="material-icon">my_location</span>
                          </div>
                          <div className="premium-route-text">
                            <h4 className="premium-route-label">Pickup</h4>
                            <p className="premium-route-value">{ride.pickup}</p>
                          </div>
                        </div>
                        
                        <div className="premium-route-connector"></div>
                        
                        <div className="premium-route-point">
                          <div className="premium-route-icon destination">
                            <span className="material-icon">place</span>
                          </div>
                          <div className="premium-route-text">
                            <h4 className="premium-route-label">Destination</h4>
                            <p className="premium-route-value">{ride.destination}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="premium-ride-details">
                        <div className="premium-ride-info">
                          <span className="premium-offer-icon material-icon" style={{ fontSize: 32, color: '#4CAF50' }}></span>
                          <span className="premium-info-text">{ride.driverName}</span>
                        </div>
                        <div className="premium-ride-info">
                          <span className="premium-info-icon material-icon">directions_car</span>
                          <span className="premium-info-text">{ride.vehicleType}</span>
                        </div>
                        <div className="premium-ride-info">
                          <span className="premium-info-icon material-icon">route</span>
                          <span className="premium-info-text">{ride.distance} km</span>
                        </div>
                        <div className="premium-ride-info">
                          <span className="premium-info-icon material-icon">payments</span>
                          <span className="premium-info-text">₹{ride.fare}</span>
                        </div>
                      </div>
                      
                      <div className="premium-ride-actions">
                        <button className="premium-btn premium-btn-secondary">
                          <span className="material-icon">receipt_long</span>
                          <span>View Receipt</span>
                        </button>
                        <button className="premium-btn premium-btn-primary">
                          <span className="material-icon">replay</span>
                          <span>Book Again</span>
                        </button>
                      </div>
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
        {/* Confirmation Header */}
        <header className="premium-confirmation-header">
          <div className="premium-confirmation-icon">
            <span className="material-icon">check_circle</span>
          </div>
          <h1 className="premium-confirmation-title">Ride Confirmed</h1>
          <p className="premium-confirmation-subtitle">Your driver is on the way</p>
        </header>
        
        {/* Trip Details Card */}
        <div className="premium-trip-card">
          {/* Driver Info */}
          <div className="premium-driver-details">
            <div className="premium-driver-header">
              <h2 className="premium-section-title">Your Driver</h2>
              <div className="premium-eta-badge">
                <span className="material-icon">schedule</span>
                <span>Arriving in {driverOffer.etaMinutes} min</span>
              </div>
            </div>
            
            <div className="premium-driver-profile">
              <div className="premium-driver-avatar">
                <span className="material-icon">person</span>
              </div>
              <div className="premium-driver-info">
                <h3 className="premium-driver-name">{driverOffer.driverName}</h3>
                <div className="premium-vehicle-info">
                  <span className="material-icon">directions_car</span>
                  <span className="premium-vehicle-model">{driverOffer.vehicleModel}</span>
                  <span className="premium-license-plate">{driverOffer.vehicleLicensePlate}</span>
                </div>
              </div>
              <button 
                onClick={() => alert('Contact Driver feature coming soon!')}
                className="premium-contact-btn"
              >
                <span className="material-icon">phone</span>
                <span>Contact</span>
              </button>
            </div>
          </div>
          
          {/* Ride Details */}
          <div className="premium-trip-details">
            <h2 className="premium-section-title">Trip Details</h2>
            
            <div className="premium-trip-info-grid">
              <div className="premium-trip-info-card">
                <div className="premium-trip-info-icon">
                  <span className="material-icon">payments</span>
                </div>
                <div className="premium-trip-info-content">
                  <h4 className="premium-trip-info-label">Estimated Fare</h4>
                  <p className="premium-trip-info-value">₹{driverOffer.estimatedFare.toFixed(0)}</p>
                </div>
              </div>
              
              <div className="premium-trip-info-card">
                <div className="premium-trip-info-icon">
                  <span className="material-icon">route</span>
                </div>
                <div className="premium-trip-info-content">
                  <h4 className="premium-trip-info-label">Trip Distance</h4>
                  <p className="premium-trip-info-value">{tripDistance || 20} km</p>
                </div>
              </div>
              
              <div className="premium-trip-info-card">
                <div className="premium-trip-info-icon">
                  <span className="material-icon">timer</span>
                </div>
                <div className="premium-trip-info-content">
                  <h4 className="premium-trip-info-label">Trip Duration</h4>
                  <p className="premium-trip-info-value">15-25 min</p>
                  <p className="premium-trip-info-note">Calculated on pickup</p>
                </div>
              </div>
            </div>
            
            <div className="premium-route-details">
              <div className="premium-route-point">
                <div className="premium-route-icon pickup">
                  <span className="material-icon">my_location</span>
                </div>
                <div className="premium-route-text">
                  <h4 className="premium-route-label">Pickup</h4>
                  <p className="premium-route-value">{L.latLng(tripParams.pickup).toString()}</p>
                </div>
              </div>
              
              <div className="premium-route-connector"></div>
              
              <div className="premium-route-point">
                <div className="premium-route-icon destination">
                  <span className="material-icon">place</span>
                </div>
                <div className="premium-route-text">
                  <h4 className="premium-route-label">Destination</h4>
                  <p className="premium-route-value">{tripParams.destination}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Done Button */}
        <button 
          onClick={() => {
            // Reset states for a new booking
            setTripParams(null);
            setSelectedVehicleClass(null);
            setDriverOffer(null);
            setSearchAttempts(0);
            setSearchStatusMessage('');
            setCurrentView(HomePageView.MAP_AND_DESTINATION);
          }}
          className="premium-button mt-md"
        >
          <span className="premium-button-text">
            Book Another Ride <span className="premium-button-icon material-icon">add_circle</span>
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="container animate-fade-in">
      {/* Permissions Manager - handles geolocation and notification permissions */}
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

      {showPermissionWarning && (
        <div className="premium-alert mb-md animate-fade-in">
          <div className="premium-alert-content">
            <span className="premium-alert-icon material-icon">priority_high</span>
            <div className="premium-alert-text">
              <h4 className="premium-alert-title">Attention Required</h4>
              <p className="premium-alert-message">
                {permissionsStatus.geolocation === 'denied' && "Location services are required to provide you with accurate service."}
                {(permissionsStatus.geolocation === 'prompt' && !currentLocation) && "Please allow location access when prompted for optimal service."}
                {permissionsStatus.geolocation === 'denied' && permissionsStatus.notifications === 'denied' && <span className="premium-separator"></span>}
                {permissionsStatus.notifications === 'denied' && "Enable notifications to receive important updates about your ride."}
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
                <p className="premium-card-description">Receive real-time alerts about your ride status</p>
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

      {/* Map Display */}
      <section className="premium-section">
        <h3 className="premium-section-title">Current Location</h3>
        <div className="premium-map-container">
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
              <span className="material-icon">touch_app</span> Select your pickup location
            </div>
          )}
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

      {/* Pickup Controls */}
      <section className="premium-section">
        <h3 className="premium-section-title">Pickup Location</h3>
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
                  <span className="premium-option-label">{isSelectingPickupMode ? 'Cancel Selection' : 'Select on Map'}</span>
                  <span className="premium-option-desc">{isSelectingPickupMode ? 'Return to options' : 'Choose precise location'}</span>
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
                  <span className="premium-option-label">Use Current Location</span>
                  <span className="premium-option-desc">Set pickup at your position</span>
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
                    <span className="premium-option-label">Clear Location</span>
                    <span className="premium-option-desc">Remove selected pickup point</span>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Destination and Search Radius */}
      <section className="premium-section">
        {/* Destination Input */}
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
                    placeholder="Enter your destination"
                    className="premium-input"
                  />
                  <label htmlFor="destination" className="premium-input-label">Where would you like to go?</label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search Radius */}
        <div className="premium-section-row">
          <h3 className="premium-section-title">Search Range</h3>
          <div className="premium-card">
            <div className="premium-card-content">
              <div className="premium-slider-header">
                <div className="premium-slider-info">
                  <span className="premium-slider-icon material-icon">radar</span>
                  <div className="premium-slider-text">
                    <span className="premium-slider-label">Driver Search Radius</span>
                    <span className="premium-slider-desc">Adjust the area to find available drivers</span>
                  </div>
                </div>
                <div className="premium-slider-value">
                  {(searchRadiusInput / 1000).toFixed(1)} km
                </div>
              </div>
              
              <div className="premium-slider-container">
                <input
                  type="range"
                  id="searchRadius"
                  min="500" 
                  max="3000" 
                  step="100" 
                  value={searchRadiusInput} 
                  onChange={(e) => setSearchRadiusInput(Number(e.target.value))} 
                  className="premium-slider"
                />
                <div className="premium-slider-labels">
                  <span>Nearby</span>
                  <span>Extended Range</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Next Button Section */}
      <section className="premium-section">
        <button 
          onClick={handleProceedToVehicleSelection} 
          disabled={isNextDisabled}
          className={`premium-button ${isNextDisabled ? 'premium-button-disabled' : ''} animate-fade-in`}
        >
          <span className="premium-button-text">
            Continue <span className="premium-button-icon material-icon">arrow_forward</span>
          </span>
        </button>
      </section>

    </div>
  );
}
