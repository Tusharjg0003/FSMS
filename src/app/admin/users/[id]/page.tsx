'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { MALAYSIAN_CITIES } from '@/lib/malaysian-cities.js';

interface Role {
  id: number;
  name: string;
}

export default function EditUserPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const userId = params?.id;
  const [roles, setRoles] = useState<Role[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && (session?.user as any)?.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [status, session, router]);

  useEffect(() => {
    if (userId) {
      fetchUser();
      fetchRoles();
    }
  }, [userId]);

  const fetchUser = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        setError('User not found');
      }
    } catch (error) {
      setError('Error fetching user');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await fetch('/api/roles');
      if (res.ok) {
        const data = await res.json();
        setRoles(data);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const formData = new FormData(e.currentTarget);
    const updateData: any = {
      name: formData.get('name'),
      email: formData.get('email'),
      roleId: formData.get('roleId'),
    };
    const password = formData.get('password');
    if (password) updateData.password = password;
    
    // Add technician preferences if user is a technician
    if ((user as any).role?.name === 'TECHNICIAN') {
      const preferredWorkingLocation = formData.get('preferredWorkingLocation');
      const preferredLatitude = formData.get('preferredLatitude');
      const preferredLongitude = formData.get('preferredLongitude');
      const preferredRadiusKm = formData.get('preferredRadiusKm');
      const isAvailable = formData.get('isAvailable');
      
      if (preferredWorkingLocation) updateData.preferredWorkingLocation = preferredWorkingLocation;
      if (preferredLatitude) updateData.preferredLatitude = parseFloat(preferredLatitude as string);
      if (preferredLongitude) updateData.preferredLongitude = parseFloat(preferredLongitude as string);
      if (preferredRadiusKm) updateData.preferredRadiusKm = parseFloat(preferredRadiusKm as string);
      if (isAvailable) updateData.isAvailable = true;
    }
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      if (res.ok) {
        // Refresh user data to show updated coordinates
        await fetchUser();
        setSuccess('User updated successfully! Coordinates have been automatically assigned.');
        setTimeout(() => setSuccess(''), 5000);
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'Failed to update user');
      }
    } catch (error) {
      setError('An error occurred while updating the user');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return null;
  }
  if (!user) {
    return <div className="min-h-screen flex items-center justify-center">User not found.</div>;
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen ">
        <div className="px-5 mx-auto py-8">
          <div className="mb-6">
            <Link href="/admin/users" className="text-blue-600 hover:text-blue-900 text-sm font-medium">Back to Users</Link>
            <h1 className="mt-2 text-3xl font-bold text-gray-900">Edit User</h1>
          </div>
          <div className="bg-white shadow rounded-lg p-6 ">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}
              {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">{success}</div>}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name *</label>
                <input id="name" name="name" type="text" required defaultValue={user.name} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-400 px-4 py-2" />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email *</label>
                <input id="email" name="email" type="email" required defaultValue={user.email} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-400 px-4 py-2" />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password (leave blank to keep unchanged)</label>
                <input id="password" name="password" type="password" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-400 px-4 py-2" />
              </div>
              <div>
                <label htmlFor="roleId" className="block text-sm font-medium text-gray-700">Role *</label>
                <select id="roleId" name="roleId" required defaultValue={user.roleId} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-400 px-4 py-2">
                  <option value="">Select a role</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </select>
              </div>

              {/* Technician Location Preferences */}
              {user.role?.name === 'TECHNICIAN' && (
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Technician Location Preferences</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="preferredWorkingLocation" className="block text-sm font-medium text-gray-700">Preferred Working Location</label>
                      <select 
                        id="preferredWorkingLocation" 
                        name="preferredWorkingLocation" 
                        defaultValue={user.preferredWorkingLocation || ''} 
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-4 py-2"
                      >
                        <option value="">Select preferred location</option>
                        {MALAYSIAN_CITIES.map((city, index) => (
                          <option key={index} value={`${city.city}, ${city.state}`}>
                            {city.city}, {city.state}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label htmlFor="preferredRadiusKm" className="block text-sm font-medium text-gray-700">Service Radius (km)</label>
                      <input 
                        id="preferredRadiusKm" 
                        name="preferredRadiusKm" 
                        type="number" 
                        step="0.1"
                        min="1"
                        max="50"
                        defaultValue={user.preferredRadiusKm || 10} 
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-4 py-2" 
                      />
                    </div>
                    
                    {/* Coordinates are automatically assigned - no manual input needed */}
                    <div className="md:col-span-2">
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
                  
                  <div className="mt-4">
                    <label className="flex items-center">
                      <input 
                        type="checkbox" 
                        name="isAvailable" 
                        defaultChecked={user.isAvailable || false}
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      />
                      <span className="ml-2 text-sm text-gray-700">Available for job assignments</span>
                    </label>
                  </div>
                  
                  {/* Display current location info */}
                  {(user.preferredLatitude && user.preferredLongitude) && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                      <h4 className="text-sm font-medium text-blue-900 mb-2">Current Location Settings</h4>
                      <div className="text-sm text-blue-800">
                        <p><strong>Coordinates:</strong> ({user.preferredLatitude}, {user.preferredLongitude})</p>
                        <p><strong>Service Radius:</strong> {user.preferredRadiusKm || 10} km</p>
                        <p><strong>Status:</strong> {user.isAvailable ? 'Available' : 'Not Available'}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div className="flex justify-end space-x-3">
                <Link href="/admin/users" className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">Cancel</Link>
                <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed">{loading ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
    
  );
} 