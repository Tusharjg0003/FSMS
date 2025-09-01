'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

interface TechnicianLocation {
  id: number;
  name: string;
  email: string;
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

interface TechnicianMapProps {
  showHistory?: boolean;
  refreshInterval?: number; // in milliseconds
}

export default function TechnicianMap({ 
  showHistory = false, 
  refreshInterval = 30000 // 30 seconds
}: TechnicianMapProps) {
  const { data: session } = useSession();
  const [technicians, setTechnicians] = useState<TechnicianLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [selectedTechnician, setSelectedTechnician] = useState<TechnicianLocation | null>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 0, lng: 0 });
  const [zoom, setZoom] = useState(10);

  // Fetch technician locations
  const fetchTechnicianLocations = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (showHistory) params.append('includeHistory', 'true');
      
      const response = await fetch(`/api/admin/technician-locations?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTechnicians(data.technicians);
        
        // Set map center to average of all technician locations
        if (data.technicians.length > 0) {
          const avgLat = data.technicians.reduce((sum: number, tech: TechnicianLocation) => 
            sum + tech.currentLatitude, 0) / data.technicians.length;
          const avgLng = data.technicians.reduce((sum: number, tech: TechnicianLocation) => 
            sum + tech.currentLongitude, 0) / data.technicians.length;
          setMapCenter({ lat: avgLat, lng: avgLng });
        }
      } else {
        setError('Failed to fetch technician locations');
      }
    } catch (error) {
      console.error('Error fetching technician locations:', error);
      setError('Error fetching technician locations');
    } finally {
      setLoading(false);
    }
  };

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Get status color for jobs
  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'assigned': return 'bg-yellow-500';
      case 'in_progress': return 'bg-blue-500';
      case 'on_site': return 'bg-green-500';
      case 'completed': return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  };

  // Initialize and set up refresh interval
  useEffect(() => {
    fetchTechnicianLocations();
    
    const interval = setInterval(fetchTechnicianLocations, refreshInterval);
    
    return () => clearInterval(interval);
  }, [refreshInterval, showHistory]);

  // Auto-refresh when component becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchTechnicianLocations();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

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

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Technician Locations</h3>
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

      {/* Map Visualization */}
      <div className="mb-6">
        <div className="bg-gradient-to-br from-blue-50 via-white to-green-50 rounded-lg p-4 h-96 relative overflow-hidden border border-gray-200">
          {/* Enhanced map representation */}
          <div className="w-full h-full relative">
            {/* Map background with geographical features */}
            <div className="absolute inset-0">
              {/* Water bodies */}
              <div className="absolute top-1/4 left-1/4 w-32 h-24 bg-blue-200 rounded-full opacity-30"></div>
              <div className="absolute bottom-1/4 right-1/4 w-20 h-16 bg-blue-200 rounded-full opacity-30"></div>
              
              {/* Roads */}
              <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-400 opacity-40"></div>
              <div className="absolute top-0 left-1/2 w-1 h-full bg-gray-400 opacity-40"></div>
              <div className="absolute top-1/3 left-0 w-full h-0.5 bg-gray-300 opacity-30"></div>
              <div className="absolute top-0 left-1/3 w-0.5 h-full bg-gray-300 opacity-30"></div>
              
              {/* Buildings/landmarks */}
              <div className="absolute top-1/6 left-1/6 w-8 h-8 bg-gray-600 rounded opacity-60"></div>
              <div className="absolute top-1/6 right-1/6 w-6 h-6 bg-gray-600 rounded opacity-60"></div>
              <div className="absolute bottom-1/6 left-1/6 w-10 h-8 bg-gray-600 rounded opacity-60"></div>
              <div className="absolute bottom-1/6 right-1/6 w-7 h-7 bg-gray-600 rounded opacity-60"></div>
              
              {/* Parks/green areas */}
              <div className="absolute top-1/3 left-1/3 w-16 h-12 bg-green-200 rounded-full opacity-40"></div>
              <div className="absolute bottom-1/3 right-1/3 w-12 h-10 bg-green-200 rounded-full opacity-40"></div>
              
              {/* Grid overlay */}
              <div className="absolute inset-0 opacity-10">
                <div className="w-full h-full" style={{
                  backgroundImage: `
                    linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
                  `,
                  backgroundSize: '40px 40px'
                }} />
              </div>
            </div>

            {/* Compass rose */}
            <div className="absolute top-4 left-4 w-16 h-16 bg-white rounded-full shadow-md flex items-center justify-center">
              <div className="text-xs text-gray-700 font-bold">N</div>
            </div>

            {/* Technician markers */}
            {technicians.map((tech) => (
              <div
                key={tech.id}
                className="absolute cursor-pointer transform -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${((tech.currentLongitude - (mapCenter.lng - 0.1)) / 0.2) * 100}%`,
                  top: `${((tech.currentLatitude - (mapCenter.lat + 0.1)) / -0.2) * 100}%`,
                }}
                onClick={() => setSelectedTechnician(tech)}
              >
                <div className="relative">
                  <div className="w-8 h-8 bg-blue-600 rounded-full border-3 border-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform">
                    <span className="text-white text-sm font-bold">
                      {tech.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  {/* Active job indicator */}
                  {tech.jobs.length > 0 && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-md"></div>
                  )}
                  {/* Technician name label */}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                    {tech.name}
                  </div>
                </div>
              </div>
            ))}

            {/* Map controls */}
            <div className="absolute top-4 right-4 flex flex-col gap-2">
              <button
                onClick={() => setZoom(Math.min(zoom + 1, 20))}
                className="w-10 h-10 bg-white rounded-lg shadow-md flex items-center justify-center text-gray-700 hover:bg-gray-50 border border-gray-200"
              >
                <span className="text-lg font-bold">+</span>
              </button>
              <button
                onClick={() => setZoom(Math.max(zoom - 1, 1))}
                className="w-10 h-10 bg-white rounded-lg shadow-md flex items-center justify-center text-gray-700 hover:bg-gray-50 border border-gray-200"
              >
                <span className="text-lg font-bold">-</span>
              </button>
            </div>

            {/* Zoom level indicator */}
            <div className="absolute bottom-4 left-4 bg-white px-3 py-2 rounded-lg text-sm text-gray-700 shadow-md border border-gray-200">
              Zoom: {zoom}x
            </div>

            {/* Map legend */}
            <div className="absolute bottom-4 right-4 bg-white px-3 py-2 rounded-lg text-xs text-gray-700 shadow-md border border-gray-200">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                <span>Technician</span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>On Job</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-600 rounded"></div>
                <span>Building</span>
              </div>
            </div>
          </div>
        </div>
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

              {tech.jobs.length > 0 && (
                <div>
                  <span className="text-gray-700 font-medium">Active Jobs:</span>
                  <div className="space-y-1 mt-1">
                    {tech.jobs.map((job) => (
                      <div key={job.id} className="flex items-center gap-2 text-xs">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(job.status)}`}></div>
                        <span className="font-medium text-gray-900">#{job.id}</span>
                        <span className="text-gray-700">{job.jobType.name}</span>
                        <span className="text-gray-600">({job.status})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Distance from center */}
              <div className="text-xs text-gray-600">
                Distance: {calculateDistance(
                  mapCenter.lat, 
                  mapCenter.lng, 
                  tech.currentLatitude, 
                  tech.currentLongitude
                ).toFixed(1)} km from center
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Selected Technician Details */}
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
                          <div className={`w-3 h-3 rounded-full ${getStatusColor(job.status)}`}></div>
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
