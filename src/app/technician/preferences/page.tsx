'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { MALAYSIAN_CITIES } from '@/lib/malaysian-cities.js';

interface TechnicianPreferences {
  id: number;
  name: string;
  email: string;
  preferredWorkingLocation?: string;
  preferredLatitude?: number; // Read-only, automatically assigned
  preferredLongitude?: number; // Read-only, automatically assigned
  preferredRadiusKm?: number;
  timezone?: string;
  isAvailable?: boolean;
}

export default function TechnicianPreferencesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [preferences, setPreferences] = useState<TechnicianPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session?.user?.role !== 'TECHNICIAN') {
      router.push('/dashboard');
    }
  }, [status, session, router]);

  useEffect(() => {
    if (session?.user?.role === 'TECHNICIAN') {
      fetchPreferences();
    }
  }, [session]);

  const fetchPreferences = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/technician/preferences');
      if (res.ok) {
        const data = await res.json();
        setPreferences(data);
      } else {
        setError('Failed to fetch preferences');
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
      setError('Error fetching preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    const formData = new FormData(e.currentTarget);
    const updateData = {
      preferredWorkingLocation: formData.get('preferredWorkingLocation') as string,
      // Coordinates are automatically assigned - no manual input needed
      preferredRadiusKm: formData.get('preferredRadiusKm') ? parseFloat(formData.get('preferredRadiusKm') as string) : undefined,
      timezone: formData.get('timezone') as string,
      isAvailable: formData.get('isAvailable') === 'on',
    };

    try {
      const res = await fetch('/api/technician/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (res.ok) {
        const data = await res.json();
        setPreferences(data.technician);
        setSuccess('Preferences updated successfully! Coordinates have been automatically assigned.');
        setTimeout(() => setSuccess(''), 5000);
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'Failed to update preferences');
      }
    } catch (error) {
      setError('An error occurred while updating preferences');
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-lg">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!session || session.user?.role !== 'TECHNICIAN') {
    return null;
  }

  if (!preferences) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-lg text-red-600">Failed to load preferences</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen">
        <div className="mx-auto py-8 px-4">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Preferences</h1>
            <p className="text-gray-600">Manage your working location and availability settings</p>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}
            
            {success && (
              <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="border-b pb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <p className="mt-1 text-sm text-gray-900">{preferences.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <p className="mt-1 text-sm text-gray-900">{preferences.email}</p>
                  </div>
                </div>
              </div>

              {/* Location Preferences */}
              <div className="border-b pb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Location Preferences</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="preferredWorkingLocation" className="block text-sm font-medium text-gray-700">
                      Preferred Working Location
                    </label>
                    <select
                      id="preferredWorkingLocation"
                      name="preferredWorkingLocation"
                      defaultValue={preferences.preferredWorkingLocation || ''}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-4 py-2"
                    >
                      <option value="">Select preferred location</option>
                      {MALAYSIAN_CITIES.map((city, index) => (
                        <option key={index} value={`${city.city}, ${city.state}`}>
                          {city.city}, {city.state}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">The general area where you prefer to work</p>
                  </div>
                  
                  <div>
                    <label htmlFor="preferredRadiusKm" className="block text-sm font-medium text-gray-700">
                      Service Radius (km)
                    </label>
                    <input
                      id="preferredRadiusKm"
                      name="preferredRadiusKm"
                      type="number"
                      step="0.1"
                      min="1"
                      max="50"
                      defaultValue={preferences.preferredRadiusKm || 10}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-4 py-2"
                    />
                    <p className="mt-1 text-xs text-gray-500">How far you're willing to travel for jobs</p>
                  </div>
                  
                  {/* Coordinates are automatically assigned - no manual input needed */}
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-yellow-800">
                          Automatic Coordinate Assignment
                        </h3>
                        <div className="mt-2 text-sm text-yellow-700">
                          <p>Coordinates are automatically assigned when you select a preferred working location. No manual entry required.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Availability */}
              <div className="border-b pb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Availability</h3>
                
                <div className="flex items-center">
                  <input
                    id="isAvailable"
                    name="isAvailable"
                    type="checkbox"
                    defaultChecked={preferences.isAvailable || false}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                  <label htmlFor="isAvailable" className="ml-2 text-sm text-gray-700">
                    Available for job assignments
                  </label>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Uncheck this if you're temporarily unavailable for new job assignments
                </p>
              </div>

              {/* Current Settings Display */}
              {(preferences.preferredLatitude && preferences.preferredLongitude) && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Current Location Settings</h4>
                  <div className="text-sm text-blue-800">
                    <p><strong>Coordinates:</strong> ({preferences.preferredLatitude}, {preferences.preferredLongitude})</p>
                    <p><strong>Service Radius:</strong> {preferences.preferredRadiusKm || 10} km</p>
                    <p><strong>Status:</strong> {preferences.isAvailable ? 'Available' : 'Not Available'}</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
