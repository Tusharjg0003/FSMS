'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import {  IconEdit, IconTrash, IconRestore } from '@tabler/icons-react';

interface JobType {
  id: number;
  name: string;
  description?: string;
  deletedAt?: string | null;
}

export default function AdminJobTypesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [jobTypes, setJobTypes] = useState<JobType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  //will have an additional section showing all deleted job types 
  const [showDeletedModal, setShowDeletedModal] = useState(false);
  const [deletedJobTypes, setDeletedJobTypes] = useState<JobType[]>([]);
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

  
  const fetchAllJobTypes = async () => {
  try {
    const res = await fetch('/api/admin/job-types/all');
    if (res.ok) {
      const data = await res.json();
      setDeletedJobTypes(data); // Direct assignment, no filter needed
    }
  } catch (error) {
    console.error('Error fetching deleted job types');
  }
};

  const handleShowDeleted = () => {
    fetchAllJobTypes();
    setShowDeletedModal(true);
  };

  const handleRestore = async (id: number) => {
    if (!window.confirm('Are you sure you want to restore this job type?')) return;
    
    try {
      const res = await fetch(`/api/admin/job-types/${id}`, { method: 'PUT' });
      if (res.ok) {
        alert('Job type restored successfully!');
        fetchJobTypes(); // Refresh active list
        fetchAllJobTypes(); // Refresh deleted list
      } else {
        alert('Failed to restore job type');
      }
    } catch (error) {
      alert('Error restoring job type');
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
          <div className="flex justify-between items-center mb-10">
            <h1 className="text-3xl font-bold text-gray-900">Job Types</h1> 
            <div className="flex gap-3">
              <button
                onClick={handleShowDeleted}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2"
                title="View deleted job types"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Deleted
              </button>
              <button
                onClick={handleAdd}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Add Job Type
              </button>
            </div>
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
                {jobTypes.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">
                      No active job types
                    </td>
                  </tr>
                ) : (
                  jobTypes.map((jt) => (
                    <tr key={jt.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{jt.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{jt.description}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEdit(jt)}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          <IconEdit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(jt.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <IconTrash className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Add/Edit Form Modal */}
          {showForm && (
            <div className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-xl">
              <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
                <h2 className="text-black text-xl font-bold mb-4">{formMode === 'add' ? 'Add Job Type' : 'Edit Job Type'}</h2>
                {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
                <form onSubmit={handleFormSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name *</label>
                    <input id="name" name="name" type="text" required value={formData.name} onChange={handleFormChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-700 px-4 py-2" />
                  </div>
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea id="description" name="description" value={formData.description} onChange={handleFormChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-700 px-4 py-2" />
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium disabled:opacity-50"
                    >
                      {loading ? 'Saving...' : (formMode === 'add' ? 'Add' : 'Save')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Deleted Job Types Modal */}
          {showDeletedModal && (
            <div className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-xl">
              <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-3xl max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-black text-xl font-bold">Deleted Job Types</h2>
                  <button
                    onClick={() => setShowDeletedModal(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {deletedJobTypes.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No deleted job types</p>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deleted At</th>
                        <th className="px-6 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {deletedJobTypes.map((jt) => (
                        <tr key={jt.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{jt.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{jt.description}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {jt.deletedAt ? new Date(jt.deletedAt).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => handleRestore(jt.id)}
                              className="text-green-600 bg-white-300 hover:text-green-900"
                            >
                              <IconRestore className="h-5 w-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}