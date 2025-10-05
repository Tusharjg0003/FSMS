'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import { useSession } from 'next-auth/react';

interface TechnicianLocation {
  id: number;
  name: string;
  email: string;
  isAvailable?: boolean;
  currentLatitude: number;
  currentLongitude: number;
  lastLocationUpdate: string;
  profilePicture?: string;
  jobs: Array<{
    id: number;
    location: string;
    status: string;
    startTime: string;
    jobType: {
      name: string;
    };
  }>;
}

interface GoogleMapsTechnicianTrackerProps {
  showHistory?: boolean;
  refreshInterval?: number; // in milliseconds
  apiKey?: string;
}

// Google Maps component
function MapComponent({ 
  technicians, 
  onTechnicianSelect, 
  selectedTechnician 
}: { 
  technicians: TechnicianLocation[];
  onTechnicianSelect: (tech: TechnicianLocation) => void;
  selectedTechnician: TechnicianLocation | null;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = new google.maps.Map(mapRef.current, {
      center: technicians.length > 0 
        ? { 
            lat: technicians.reduce((sum, tech) => sum + tech.currentLatitude, 0) / technicians.length,
            lng: technicians.reduce((sum, tech) => sum + tech.currentLongitude, 0) / technicians.length
          }
        : { lat: 37.7749, lng: -122.4194 }, // Default to San Francisco
      zoom: 12,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        }
      ]
    });

    mapInstanceRef.current = map;
    infoWindowRef.current = new google.maps.InfoWindow();

    // Add map controls
    map.controls[google.maps.ControlPosition.TOP_RIGHT].push(
      createMapControl('Zoom In', () => {
        const currentZoom = map.getZoom();
        if (currentZoom) map.setZoom(currentZoom + 1);
      })
    );

    map.controls[google.maps.ControlPosition.TOP_RIGHT].push(
      createMapControl('Zoom Out', () => {
        const currentZoom = map.getZoom();
        if (currentZoom) map.setZoom(currentZoom - 1);
      })
    );

    map.controls[google.maps.ControlPosition.TOP_RIGHT].push(
      createMapControl('Fit Bounds', () => {
        if (technicians.length > 0) {
          const bounds = new google.maps.LatLngBounds();
          technicians.forEach(tech => {
            bounds.extend({ lat: tech.currentLatitude, lng: tech.currentLongitude });
          });
          map.fitBounds(bounds);
        }
      })
    );

  }, [technicians]);

  // Create custom map control
  const createMapControl = (title: string, onClick: () => void) => {
    const controlDiv = document.createElement('div');
    controlDiv.style.backgroundColor = 'white';
    controlDiv.style.border = '1px solid #ccc';
    controlDiv.style.borderRadius = '4px';
    controlDiv.style.boxShadow = '0 2px 6px rgba(0,0,0,.3)';
    controlDiv.style.cursor = 'pointer';
    controlDiv.style.marginBottom = '8px';
    controlDiv.style.textAlign = 'center';
    controlDiv.style.width = '80px';
    controlDiv.style.height = '32px';
    controlDiv.style.display = 'flex';
    controlDiv.style.alignItems = 'center';
    controlDiv.style.justifyContent = 'center';
    controlDiv.style.fontSize = '12px';
    controlDiv.style.fontWeight = 'bold';
    controlDiv.title = title;
    controlDiv.textContent = title;

    controlDiv.addEventListener('click', onClick);
    controlDiv.addEventListener('mouseover', () => {
      controlDiv.style.backgroundColor = '#f0f0f0';
    });
    controlDiv.addEventListener('mouseout', () => {
      controlDiv.style.backgroundColor = 'white';
    });

    return controlDiv;
  };

  // Update markers when technicians change
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Create new markers
    technicians.forEach(tech => {
      const marker = new google.maps.Marker({
        position: { lat: tech.currentLatitude, lng: tech.currentLongitude },
        map: mapInstanceRef.current,
        title: tech.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: tech.jobs.length > 0 
            ? '#10B981' 
            : (tech.isAvailable === false ? '#9CA3AF' : '#3B82F6'), // gray if unavailable, blue if available
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
        },
        label: {
          text: tech.name.charAt(0).toUpperCase(),
          color: '#FFFFFF',
          fontSize: '12px',
          fontWeight: 'bold'
        }
      });

      // Add click listener
      marker.addListener('click', () => {
        onTechnicianSelect(tech);
        
        // Show info window
        if (infoWindowRef.current) {
          const content = `
            <div style="padding: 8px; min-width: 200px;">
              <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold;">${tech.name}</h3>
              <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">${tech.email}</p>
              <p style="margin: 0 0 4px 0; font-size: 12px;">
                <strong>Status:</strong> ${tech.jobs.length > 0 
                  ? 'On Job' 
                  : (tech.isAvailable === false ? 'Unavailable' : 'Available')}
              </p>
              <p style="margin: 0 0 4px 0; font-size: 12px;">
                <strong>Last Update:</strong> ${new Date(tech.lastLocationUpdate).toLocaleString()}
              </p>
              ${tech.jobs.length > 0 ? `
                <div style="margin-top: 8px;">
                  <strong style="font-size: 12px;">Active Jobs:</strong>
                  ${tech.jobs.map(job => `
                    <div style="font-size: 11px; margin: 2px 0; padding: 2px 4px; background: #f0f0f0; border-radius: 3px;">
                      #${job.id} - ${job.jobType.name} (${job.status})
                    </div>
                  `).join('')}
                </div>
              ` : ''}
              <div style="margin-top: 8px;">
                <a href="https://www.google.com/maps?q=${tech.currentLatitude},${tech.currentLongitude}" 
                   target="_blank" 
                   style="color: #3B82F6; text-decoration: none; font-size: 12px;">
                  View on Google Maps &rarr;
                </a>
              </div>
            </div>
          `;
          
          infoWindowRef.current.setContent(content);
          infoWindowRef.current.open(mapInstanceRef.current, marker);
        }
      });

      markersRef.current.push(marker);
    });

    // Fit bounds to show all technicians
    if (technicians.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      technicians.forEach(tech => {
        bounds.extend({ lat: tech.currentLatitude, lng: tech.currentLongitude });
      });
      mapInstanceRef.current.fitBounds(bounds);
    }

  }, [technicians, onTechnicianSelect]);

  return <div ref={mapRef} style={{ width: '100%', height: '500px' }} />;
}

// Loading component
const LoadingComponent = () => (
  <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600">Loading Google Maps...</p>
    </div>
  </div>
);

// Error component
const ErrorComponent = ({ status }: { status: Status }) => (
  <div className="flex items-center justify-center h-96 bg-red-50 rounded-lg">
    <div className="text-center">
      <div className="text-red-600 text-6xl mb-4">&#x26A0;</div>
      <h3 className="text-lg font-semibold text-red-800 mb-2">Failed to load Google Maps</h3>
      <p className="text-red-600 mb-4">
        {status === Status.FAILURE ? 'Google Maps API failed to load' : 'Unknown error occurred'}
      </p>
      <p className="text-sm text-red-500">
        Please check your Google Maps API key and internet connection.
      </p>
    </div>
  </div>
);

export default function GoogleMapsTechnicianTracker({ 
  showHistory = false, 
  refreshInterval = 30000,
  apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
}: GoogleMapsTechnicianTrackerProps) {
  const { data: session } = useSession();
  const [technicians, setTechnicians] = useState<TechnicianLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [selectedTechnician, setSelectedTechnician] = useState<TechnicianLocation | null>(null);

  // Fetch technician locations
  const fetchTechnicianLocations = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (showHistory) params.append('includeHistory', 'true');
      
      const response = await fetch(`/api/admin/technician-locations?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTechnicians(data.technicians);
        setError('');
      } else {
        setError('Failed to fetch technician locations');
      }
    } catch (error) {
      console.error('Error fetching technician locations:', error);
      setError('Error fetching technician locations');
    } finally {
      setLoading(false);
    }
  }, [showHistory]);

  // Initialize and set up refresh interval
  useEffect(() => {
    fetchTechnicianLocations();
    
    const interval = setInterval(fetchTechnicianLocations, refreshInterval);
    
    return () => clearInterval(interval);
  }, [fetchTechnicianLocations, refreshInterval]);

  // Auto-refresh when component becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchTechnicianLocations();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchTechnicianLocations]);

  if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'SUPERVISOR') {
    return null;
  }

  if (loading && technicians.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Loading technician locations...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-red-600 text-center">{error}</div>
        <button
          onClick={fetchTechnicianLocations}
          className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  if (technicians.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-gray-600 text-center">No technicians with location data available</div>
      </div>
    );
  }

  const render = (status: Status) => {
    switch (status) {
      case Status.LOADING:
        return <LoadingComponent />;
      case Status.FAILURE:
        return <ErrorComponent status={status} />;
      case Status.SUCCESS:
        return (
          <MapComponent 
            technicians={technicians}
            onTechnicianSelect={setSelectedTechnician}
            selectedTechnician={selectedTechnician}
          />
        );
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Technician Locations - Google Maps</h3>
        <div className="flex gap-2">
          <button
            onClick={fetchTechnicianLocations}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
          >
            Refresh
          </button>
          <span className="text-xs text-gray-600">
            Auto-refresh: {refreshInterval / 1000}s
          </span>
        </div>
      </div>

      {/* Google Maps Integration */}
      <div className="mb-6">
        <Wrapper apiKey={apiKey || ''} render={render} />
      </div>

      {/* Technician List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {technicians.map((tech) => (
          <div
            key={tech.id}
            className={`border rounded-lg p-4 cursor-pointer transition-colors ${
              selectedTechnician?.id === tech.id 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setSelectedTechnician(tech)}
          >
            <div className="flex items-center gap-3 mb-3">
              {tech.profilePicture ? (
                <img 
                  src={tech.profilePicture} 
                  alt={tech.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600">
                  {tech.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <div className="font-medium text-gray-900">{tech.name}</div>
                <div className="text-sm text-gray-600">{tech.email}</div>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-700 font-medium">Location:</span>
                <div className="font-mono text-xs text-gray-800">
                  {tech.currentLatitude.toFixed(6)}, {tech.currentLongitude.toFixed(6)}
                </div>
              </div>
              
              <div>
                <span className="text-gray-700 font-medium">Last Update:</span>
                <div className="text-xs text-gray-800">
                  {new Date(tech.lastLocationUpdate).toLocaleString()}
                </div>
              </div>

              <div>
                <span className="text-gray-700 font-medium">Status:</span>
                <div className="text-xs text-gray-800">
                  {tech.jobs.length > 0 ? (
                    <span className="text-green-600 font-medium">On Job ({tech.jobs.length})</span>
                  ) : tech.isAvailable === false ? (
                    <span className="text-gray-600 font-medium">Off-Job</span>
                  ) : (
                    <span className="text-blue-600 font-medium">On-Job</span>
                  )}
                </div>
              </div>

              {tech.jobs.length > 0 && (
                <div>
                  <span className="text-gray-700 font-medium">Active Jobs:</span>
                  <div className="space-y-1 mt-1">
                    {tech.jobs.map((job) => (
                      <div key={job.id} className="text-xs text-gray-700">
                        <span className="font-medium">#{job.id}</span> - {job.jobType.name} ({job.status})
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Selected Technician Details Modal */}
      {selectedTechnician && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h4 className="text-lg font-semibold text-gray-900">{selectedTechnician.name}</h4>
              <button
                onClick={() => setSelectedTechnician(null)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <span className="font-medium text-gray-900">Email:</span> 
                <span className="text-gray-700 ml-2">{selectedTechnician.email}</span>
              </div>
              <div>
                <span className="font-medium text-gray-900">Status:</span> 
                <span className="text-gray-700 ml-2">{selectedTechnician.isAvailable === false ? 'Off-Job' : 'On-Job'}</span>
              </div>
              <div>
                <span className="font-medium text-gray-900">Current Location:</span>
                <div className="font-mono text-sm mt-1 text-gray-800">
                  {selectedTechnician.currentLatitude.toFixed(6)}, {selectedTechnician.currentLongitude.toFixed(6)}
                </div>
              </div>
              <div>
                <span className="font-medium text-gray-900">Last Update:</span>
                <div className="text-sm mt-1 text-gray-800">
                  {new Date(selectedTechnician.lastLocationUpdate).toLocaleString()}
                </div>
              </div>
              
              {selectedTechnician.jobs.length > 0 && (
                <div>
                  <span className="font-medium text-gray-900">Active Jobs:</span>
                  <div className="space-y-2 mt-2">
                    {selectedTechnician.jobs.map((job) => (
                      <div key={job.id} className="border rounded p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-gray-900">Job #{job.id}</span>
                          <span className="text-sm text-gray-600">({job.status})</span>
                        </div>
                        <div className="text-sm text-gray-700">{job.jobType.name}</div>
                        <div className="text-sm text-gray-600">{job.location}</div>
                        <div className="text-xs text-gray-600">
                          Started: {new Date(job.startTime).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-2">
              <a
                href={`https://www.google.com/maps?q=${selectedTechnician.currentLatitude},${selectedTechnician.currentLongitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-center py-2 px-4 rounded text-sm"
              >
                View on Google Maps
              </a>
              <button
                onClick={() => setSelectedTechnician(null)}
                className="px-4 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50 text-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
