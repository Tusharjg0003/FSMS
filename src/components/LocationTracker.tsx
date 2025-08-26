'use client';

import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';

interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
}

interface LocationHistoryItem {
  id: number;
  latitude: number;
  longitude: number;
  timestamp: string;
  accuracy?: number;
  speed?: number;
  heading?: number;
  job?: {
    id: number;
    location: string;
    status: string;
  };
}

interface LocationTrackerProps {
  jobId?: number;
  onLocationUpdate?: (location: Location) => void;
  showHistory?: boolean;
  autoTrack?: boolean;
}

export default function LocationTracker({ 
  jobId, 
  onLocationUpdate, 
  showHistory = true, 
  autoTrack = true 
}: LocationTrackerProps) {
  const { data: session, status } = useSession();
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [locationHistory, setLocationHistory] = useState<LocationHistoryItem[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isStartingRef = useRef<boolean>(false);

  // Fetch current location and history
  const fetchLocationData = async () => {
    try {
      const params = new URLSearchParams();
      if (jobId) params.append('jobId', jobId.toString());
      
      const response = await fetch(`/api/technician/location?${params}`);
      if (response.ok) {
        const data = await response.json();
        const lat = data?.currentLocation?.latitude;
        const lng = data?.currentLocation?.longitude;
        if (typeof lat === 'number' && typeof lng === 'number') {
          setCurrentLocation(data.currentLocation);
        } else {
          setCurrentLocation(null);
        }
        setLocationHistory(data.locationHistory || []);
      }
    } catch (error) {
      console.error('Error fetching location data:', error);
    }
  };

  // Stop location tracking
  function stopTracking() {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsTracking(false);
  }

  // Update location to server
  const updateLocation = async (location: Location) => {
    try {
      setLoading(true);
      const response = await fetch('/api/technician/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...location,
          jobId: jobId || null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const lat = data?.currentLocation?.latitude;
        const lng = data?.currentLocation?.longitude;
        if (typeof lat === 'number' && typeof lng === 'number') {
          setCurrentLocation(data.currentLocation);
        }
        setSuccess('Location updated successfully');
        onLocationUpdate?.(location);
        
        // Refresh location history
        fetchLocationData();
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000);
      } else if (response.status === 401) {
        stopTracking();
        setError('You are not authorized. Please sign in again.');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update location');
      }
    } catch (error) {
      setError('Error updating location');
    } finally {
      setLoading(false);
    }
  };

  // Get current GPS position
  const getCurrentPosition = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 30000,
        }
      );
    });
  };

  // Try to get position with fallback attempts on timeout
  const tryGetPositionWithFallback = async (): Promise<GeolocationPosition> => {
    try {
      return await getCurrentPosition();
    } catch (err: any) {
      // If timeout, try once more with lower accuracy and longer timeout
      if (err?.code === 3 /* TIMEOUT */) {
        return new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            resolve,
            reject,
            {
              enableHighAccuracy: false,
              timeout: 30000,
              maximumAge: 0,
            }
          );
        });
      }
      throw err;
    }
  };

  // Start location tracking
  const startTracking = async () => {
    try {
      if (isStartingRef.current || isTracking) return;
      if (status !== 'authenticated' || (session?.user as any)?.role !== 'TECHNICIAN') return;
      isStartingRef.current = true;
      setError('');
      const position = await tryGetPositionWithFallback();
      
      const location: Location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        speed: position.coords.speed || undefined,
        heading: position.coords.heading || undefined,
      };

      setCurrentLocation(location);
      await updateLocation(location);
      setIsTracking(true);

      // Set up continuous tracking
      if (autoTrack) {
        // Watch for position changes
        watchIdRef.current = navigator.geolocation.watchPosition(
          (position) => {
            const newLocation: Location = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              speed: position.coords.speed || undefined,
              heading: position.coords.heading || undefined,
            };
            setCurrentLocation(newLocation);
            updateLocation(newLocation);
          },
          (error) => {
            console.error('Location watch error:', error);
            setError('Location tracking error');
          },
          {
            enableHighAccuracy: true,
            timeout: 20000,
            maximumAge: 30000, // 30 seconds
          }
        );

        // Also update every 5 minutes as backup
        intervalRef.current = setInterval(async () => {
          try {
            const position = await tryGetPositionWithFallback();
            const location: Location = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              speed: position.coords.speed || undefined,
              heading: position.coords.heading || undefined,
            };
            await updateLocation(location);
          } catch (error) {
            console.error('Periodic location update failed:', error);
          }
        }, 5 * 60 * 1000); // 5 minutes
      }
    } catch (error) {
      console.error('Error starting location tracking:', error);
      setError('Failed to get location. Please check GPS permissions.');
    } finally {
      isStartingRef.current = false;
    }
  };

  // Manual location update
  const updateLocationManually = async () => {
    try {
      const position = await getCurrentPosition();
      const location: Location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        speed: position.coords.speed || undefined,
        heading: position.coords.heading || undefined,
      };
      await updateLocation(location);
    } catch (error) {
      setError('Failed to get current location');
    }
  };

  // Initialize component
  useEffect(() => {
    fetchLocationData();
    
    // Cleanup on unmount
    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [jobId]);

  // Auto-start tracking if enabled
  useEffect(() => {
    if (autoTrack && status === 'authenticated' && (session?.user as any)?.role === 'TECHNICIAN') {
      startTracking();
    }
  }, [autoTrack, session, status]);

  if ((session?.user as any)?.role !== 'TECHNICIAN') {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Location Tracking</h3>
      
      {/* Error and Success Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded">
          {success}
        </div>
      )}

      {/* Current Location Display */}
      <div className="mb-6">
        <h4 className="text-md font-medium text-gray-900 mb-2">Current Location</h4>
        {currentLocation && typeof currentLocation.latitude === 'number' && typeof currentLocation.longitude === 'number' ? (
          <div className="bg-gray-50 p-3 rounded">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-gray-800"><span className="font-medium text-gray-900">Latitude:</span> {currentLocation.latitude.toFixed(6)}</div>
              <div className="text-gray-800"><span className="font-medium text-gray-900">Longitude:</span> {currentLocation.longitude.toFixed(6)}</div>
              {typeof currentLocation.accuracy === 'number' && (
                <div className="text-gray-800"><span className="font-medium text-gray-900">Accuracy:</span> {currentLocation.accuracy.toFixed(1)}m</div>
              )}
              {typeof currentLocation.speed === 'number' && (
                <div className="text-gray-800"><span className="font-medium text-gray-900">Speed:</span> {(currentLocation.speed * 3.6).toFixed(1)} km/h</div>
              )}
              {typeof currentLocation.heading === 'number' && (
                <div className="text-gray-800"><span className="font-medium text-gray-900">Heading:</span> {currentLocation.heading.toFixed(0)}°</div>
              )}
            </div>
            {typeof currentLocation.accuracy === 'number' && (
              <div className="mt-2 text-xs text-gray-600">
                GPS Accuracy: {currentLocation.accuracy < 10 ? 'Excellent' : 
                               currentLocation.accuracy < 20 ? 'Good' : 
                               currentLocation.accuracy < 50 ? 'Fair' : 'Poor'}
              </div>
            )}
          </div>
        ) : (
          <div className="text-gray-600 text-sm">No location data available</div>
        )}
      </div>

      {/* Control Buttons */}
      <div className="flex gap-2 mb-6">
        {!isTracking ? (
          <button
            onClick={startTracking}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
          >
            {loading ? 'Starting...' : 'Start Tracking'}
          </button>
        ) : (
          <button
            onClick={stopTracking}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm font-medium"
          >
            Stop Tracking
          </button>
        )}
        <button
          onClick={updateLocationManually}
          disabled={loading}
          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
        >
          Update Now
        </button>
      </div>

      {/* Location History */}
      {showHistory && locationHistory.length > 0 && (
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-2">Recent Location History</h4>
          <div className="max-h-64 overflow-y-auto">
            {locationHistory.map((item) => (
              <div key={item.id} className="border-b border-gray-200 py-2">
                <div className="flex justify-between items-start">
                  <div className="text-sm">
                    <div className="font-medium text-gray-900">
                      {typeof item.latitude === 'number' && typeof item.longitude === 'number' 
                        ? `${item.latitude.toFixed(6)}, ${item.longitude.toFixed(6)}` 
                        : 'Unknown coordinates'}
                    </div>
                    <div className="text-gray-600 text-xs">
                      {new Date(item.timestamp).toLocaleString()}
                    </div>
                    {item.job && (
                      <div className="text-blue-700 text-xs">
                        Job #{item.job.id} - {item.job.status}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-600 text-right">
                    {typeof item.accuracy === 'number' && <div>±{item.accuracy.toFixed(1)}m</div>}
                    {typeof item.speed === 'number' && <div>{(item.speed * 3.6).toFixed(1)} km/h</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Map Link */}
      {currentLocation && typeof currentLocation.latitude === 'number' && typeof currentLocation.longitude === 'number' && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <a
            href={`https://www.google.com/maps?q=${currentLocation.latitude},${currentLocation.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 text-sm underline"
          >
            View on Google Maps
          </a>
        </div>
      )}
    </div>
  );
}
