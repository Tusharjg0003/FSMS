'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';

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

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
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
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      if (res.ok) {
        router.push('/admin/users?message=User updated successfully');
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
  if (!session || session.user?.role !== 'ADMIN') {
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
            <Link href="/admin/users" className="text-blue-600 hover:text-blue-900 text-sm font-medium">← Back to Users</Link>
            <h1 className="mt-2 text-3xl font-bold text-gray-900">Edit User</h1>
          </div>
          <div className="bg-white shadow rounded-lg p-6 ">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}
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