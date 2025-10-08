'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { MALAYSIAN_CITIES } from '@/lib/malaysian-cities.js';

interface Role {
  id: number;
  name: string;
}

export default function CreateUserPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [technicianFields, setTechnicianFields] = useState({
    preferredWorkingLocation: '',
    preferredRadiusKm: 10
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [status, session, router]);

  useEffect(() => {
    fetchRoles();
  }, []);

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
    
    // Get selected role to determine if technician fields are needed
    const selectedRole = roles.find(role => role.id.toString() === selectedRoleId);
    const isTechnician = selectedRole?.name === 'TECHNICIAN';
    
    const userData = {
      name: formData.get('name'),
      email: formData.get('email'),
      password: formData.get('password'),
      roleId: formData.get('roleId'),
      // Include technician fields if role is TECHNICIAN
      ...(isTechnician && {
        preferredWorkingLocation: technicianFields.preferredWorkingLocation,
        preferredRadiusKm: Number(technicianFields.preferredRadiusKm)
      })
    };
    
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      if (res.ok) {
        router.push('/admin/users?message=User created successfully');
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'Failed to create user');
      }
    } catch (error) {
      setError('An error occurred while creating the user');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  if (!session || session.user?.role !== 'ADMIN') {
    return null;
  }

  return (
    <DashboardLayout>
      <div>
        <div className="max-w-xl mx-auto py-8">
          <div className="mb-6">
            <Link href="/admin/users" className="text-blue-600 hover:text-blue-900 text-sm font-medium">← Back to Users</Link>
            <h1 className="mt-2 text-3xl font-bold text-gray-900">Add New User</h1>
          </div>
          <div className="bg-white shadow rounded-lg p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name *</label>
                <input id="name" name="name" type="text" required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-4 py-2 text-gray-500" />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email *</label>
                <input id="email" name="email" type="email" required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-4 py-2 text-gray-500" />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password *</label>
                <input id="password" name="password" type="password" required className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-4 py-2 text-gray-500" />
              </div>
              <div>
                <label htmlFor="roleId" className="block text-sm font-medium text-gray-700">Role *</label>
                <select 
                  id="roleId" 
                  name="roleId" 
                  required 
                  value={selectedRoleId}
                  onChange={(e) => setSelectedRoleId(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-4 py-2 text-gray-500"
                >
                  <option value="">Select a role</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </select>
              </div>

              {/* Technician-specific fields */}
              {selectedRoleId && roles.find(role => role.id.toString() === selectedRoleId)?.name === 'TECHNICIAN' && (
                <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="text-lg font-semibold text-blue-900">Technician Settings</h3>
                  
                  <div>
                    <label htmlFor="preferredWorkingLocation" className="block text-sm font-medium text-gray-700">
                      Preferred Working Location *
                    </label>
                    <select
                      id="preferredWorkingLocation"
                      value={technicianFields.preferredWorkingLocation}
                      onChange={(e) => setTechnicianFields(prev => ({ ...prev, preferredWorkingLocation: e.target.value }))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-4 py-2"
                      required
                    >
                      <option value="">Select preferred location</option>
                      {MALAYSIAN_CITIES.map((city) => (
                        <option key={city.city} value={city.city}>
                          {city.city}, {city.state}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="preferredRadiusKm" className="block text-sm font-medium text-gray-700">
                      Service Radius (km)
                    </label>
                    <input
                      id="preferredRadiusKm"
                      type="number"
                      min="1"
                      max="50"
                      value={technicianFields.preferredRadiusKm}
                      onChange={(e) => setTechnicianFields(prev => ({ ...prev, preferredRadiusKm: Number(e.target.value) }))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-4 py-2"
                      required
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      Distance in kilometers from preferred location
                    </p>
                  </div>

                  <div className="p-3 bg-yellow-100 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <strong>Note:</strong> Coordinates will be automatically assigned based on the preferred location. 
                      Availability windows (8 AM - 8 PM) will be created for the next 21 days.
                    </p>
                  </div>
                </div>
              )}
              <div className="flex justify-end space-x-3">
                <Link href="/admin/users" className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">Cancel</Link>
                <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed">{loading ? 'Creating...' : 'Create User'}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
    
  );
} 