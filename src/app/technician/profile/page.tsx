'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import LocationTracker from '../../../components/LocationTracker';

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
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session?.user?.role !== 'TECHNICIAN') {
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
        });
      }
    } catch (error) {
      setError('Error fetching profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        }),
      });
      if (res.ok) {
        setSuccess('Profile updated successfully!');
        setForm({ ...form, password: '' });
        fetchProfile();
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">My Profile</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Profile Information */}
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="mb-4 flex items-center gap-4">
                {form.profilePicture ? (
                  <img src={form.profilePicture} alt="Profile" className="w-20 h-20 rounded-full object-cover border" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center text-2xl text-gray-400 border">U</div>
                )}
                <div>
                  <div className="mb-2"><strong className="text-gray-900">Name:</strong> <span className="text-gray-800">{profile?.name}</span></div>
                  <div className="mb-2"><strong className="text-gray-900">Email:</strong> <span className="text-gray-800">{profile?.email}</span></div>
                  <label className="block mt-2">
                    <span className="text-sm text-gray-700">Change Profile Picture</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 mt-1"
                    />
                  </label>
                </div>
              </div>
            </div>
            
            <form onSubmit={handleProfileUpdate} className="bg-white shadow rounded-lg p-6 space-y-4">
              <h2 className="text-lg font-semibold">Update Profile</h2>
              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}
              {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">{success}</div>}
              <input
                type="text"
                name="nationality"
                value={form.nationality}
                onChange={handleChange}
                placeholder="Nationality"
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              <input
                type="date"
                name="dateOfBirth"
                value={form.dateOfBirth}
                onChange={handleChange}
                placeholder="Date of Birth"
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="New password (leave blank to keep unchanged)"
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md text-sm font-medium disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update Profile'}
              </button>
            </form>
          </div>

          {/* Location Tracking */}
          <div>
            <LocationTracker 
              showHistory={true}
              autoTrack={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
} 