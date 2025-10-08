'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import LocationTracker from '../../../components/LocationTracker';
import TechnicianDashboardLayout from '@/components/TechnicianDashboardLayout';
import { MALAYSIAN_CITIES } from '@/lib/malaysian-cities.js';

export default function TechnicianProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    profilePicture: '',
    nationality: '',
    dateOfBirth: '',
    password: '',
    preferredWorkingLocation: '',
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && (session?.user as any)?.role !== 'TECHNICIAN') {
      router.push('/dashboard');
    }
  }, [status, session, router]);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/technician/profile');
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setForm({
          profilePicture: data.profilePicture || '',
          nationality: data.nationality || '',
          dateOfBirth: data.dateOfBirth ? data.dateOfBirth.slice(0, 10) : '',
          password: '',
          preferredWorkingLocation: data.preferredWorkingLocation || '',
        });
      }
    } catch (error) {
      setError('Error fetching profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setForm((prev) => ({ ...prev, profilePicture: data.url }));
        setSuccess('Profile picture uploaded!');
      } else {
        setError('Failed to upload image');
      }
    } catch (error) {
      setError('Error uploading image');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/technician/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profilePicture: form.profilePicture,
          nationality: form.nationality,
          dateOfBirth: form.dateOfBirth,
          password: form.password || undefined,
          preferredWorkingLocation: form.preferredWorkingLocation || undefined,
        }),
      });
      if (res.ok) {
        const updatedData = await res.json();
        setSuccess('Profile updated successfully! Coordinates have been automatically assigned.');
        setForm({ ...form, password: '' });
        fetchProfile();
        setTimeout(() => setSuccess(''), 5000);
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'Failed to update profile');
      }
    } catch (error) {
      setError('Error updating profile');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  if (!session || session.user?.role !== 'TECHNICIAN') {
    return null;
  }

  return (
    <TechnicianDashboardLayout>
      <div className="flex-1 p-6 overflow-y-auto">

        {/* Main Content */}
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Profile Information Section */}
            <div className="space-y-6">
              {/* Profile Picture & Basic Info */}
              <div className="bg-white shadow-sm rounded-xl p-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Profile Information</h2>
                
                <div className="flex items-start gap-6 mb-8">
                  <div className="flex-shrink-0">
                    {form.profilePicture ? (
                      <img 
                        src={form.profilePicture} 
                        alt="Profile" 
                        className="w-24 h-24 rounded-full object-cover border-4 border-gray-100 shadow-sm" 
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-100 to-indigo-200 flex items-center justify-center text-2xl font-bold text-indigo-600 border-4 border-gray-100 shadow-sm">
                        {profile?.name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Name</label>
                      <p className="text-lg font-medium text-gray-900">{profile?.name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
                      <p className="text-lg font-medium text-gray-900">{profile?.email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Preferred Working Location</label>
                      <p className="text-lg font-medium text-gray-900">
                        {profile?.preferredWorkingLocation || 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">Change Profile Picture</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="block w-full text-sm text-gray-500 
                                 file:mr-4 file:py-2 file:px-4 
                                 file:rounded-lg file:border-0 
                                 file:text-sm file:font-semibold 
                                 file:bg-blue-50 file:text-blue-700 
                                 hover:file:bg-blue-100 file:cursor-pointer
                                 border border-gray-200 rounded-lg p-2"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Update Profile Form */}
              <div className="bg-white shadow-sm rounded-xl p-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Update Profile</h2>
                
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                    {error}
                  </div>
                )}
                
                {success && (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
                    {success}
                  </div>
                )}
                
                <form onSubmit={handleProfileUpdate} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nationality
                    </label>
                    <input
                      type="text"
                      name="nationality"
                      value={form.nationality}
                      onChange={handleChange}
                      placeholder="Enter your nationality"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg 
                               focus:ring-2 focus:ring-blue-500 focus:border-transparent
                               text-gray-900 placeholder-gray-500 transition-colors"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={form.dateOfBirth}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg 
                               focus:ring-2 focus:ring-blue-500 focus:border-transparent
                               text-gray-900 transition-colors"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Preferred Working Location
                    </label>
                    <select
                      name="preferredWorkingLocation"
                      value={form.preferredWorkingLocation}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg 
                               focus:ring-2 focus:ring-blue-500 focus:border-transparent
                               text-gray-900 transition-colors"
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Password
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      placeholder="Leave blank to keep current password"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg 
                               focus:ring-2 focus:ring-blue-500 focus:border-transparent
                               text-gray-900 placeholder-gray-500 transition-colors"
                    />
                  </div>
                  
                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400
                               text-white font-semibold py-3 px-6 rounded-lg 
                               transition-colors duration-200 
                               disabled:cursor-not-allowed"
                    >
                      {loading ? 'Updating...' : 'Update Profile'}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Location Tracking Section */}
            <div className="space-y-6">
              <div className="bg-white shadow-sm rounded-xl p-8">
                <LocationTracker 
                  showHistory={true}
                  autoTrack={true}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </TechnicianDashboardLayout>
  );
}