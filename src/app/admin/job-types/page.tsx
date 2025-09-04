'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';

interface JobType {
  id: number;
  name: string;
  description?: string;
}

export default function AdminJobTypesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [jobTypes, setJobTypes] = useState<JobType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [formData, setFormData] = useState<{ id?: number; name: string; description: string }>({ name: '', description: '' });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [status, session, router]);

  useEffect(() => {
    fetchJobTypes();
  }, []);

  const fetchJobTypes = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/job-types');
      if (res.ok) {
        const data = await res.json();
        setJobTypes(data);
      }
    } catch (error) {
      setError('Error fetching job types');
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAdd = () => {
    setFormMode('add');
    setFormData({ name: '', description: '' });
    setShowForm(true);
  };

  const handleEdit = (jobType: JobType) => {
    setFormMode('edit');
    setFormData({ id: jobType.id, name: jobType.name, description: jobType.description || '' });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this job type?')) return;
    try {
      const res = await fetch(`/api/admin/job-types/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setJobTypes((prev) => prev.filter((jt) => jt.id !== id));
      } else {
        alert('Failed to delete job type');
      }
    } catch (error) {
      alert('Error deleting job type');
    }
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      let res;
      if (formMode === 'add') {
        res = await fetch('/api/admin/job-types', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: formData.name, description: formData.description }),
        });
      } else {
        res = await fetch(`/api/admin/job-types/${formData.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: formData.name, description: formData.description }),
        });
      }
      if (res.ok) {
        fetchJobTypes();
        setShowForm(false);
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'Failed to save job type');
      }
    } catch (error) {
      setError('Error saving job type');
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

  return (
    <DashboardLayout>
      <div className="min-h-screen">
        <div className="mx-auto py-8 px-4">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Job Types</h1> 
            <button
              onClick={handleAdd}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium "
            >
              Add Job Type
            </button>
          </div>
          <div className="bg-white shadow rounded-lg overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {jobTypes.map((jt) => (
                  <tr key={jt.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{jt.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{jt.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(jt)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(jt.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {showForm && (
            <div className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-xl ">
              <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
                <h2 className=" text-black text-xl font-bold mb-4">{formMode === 'add' ? 'Add Job Type' : 'Edit Job Type'}</h2>
                {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
                <form onSubmit={handleFormSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name *</label>
                    <input id="name" name="name" type="text" required value={formData.name} onChange={handleFormChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-700 px-4 py-2" />
                  </div>
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea id="description" name="description" value={formData.description} onChange={handleFormChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-700 px-4 py-2" />
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Saving...' : (formMode === 'add' ? 'Add' : 'Save')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
    
  );
} 