'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Job {
  id: number;
  status: string;
  startTime: string;
  endTime?: string;
  location: string;
  jobType: {
    id: number;
    name: string;
  };
}

export default function TechnicianJobsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session?.user?.role !== 'TECHNICIAN') {
      router.push('/dashboard');
    }
  }, [status, session, router]);

  useEffect(() => {
    if (session?.user?.role === 'TECHNICIAN') {
      fetchJobs();
    }
  }, [session, filter]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const url = filter === 'all' ? '/api/jobs' : `/api/jobs?status=${filter}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setJobs(data);
      }
    } catch (error) {
      // handle error
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">My Jobs</h1>
        </div>
        <div className="mb-6">
          <div className="flex space-x-2">
            <button onClick={() => setFilter('all')} className={`px-3 py-1 rounded-md text-sm font-medium ${filter === 'all' ? 'bg-blue-100 text-blue-700' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>All</button>
            <button onClick={() => setFilter('pending')} className={`px-3 py-1 rounded-md text-sm font-medium ${filter === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>Pending</button>
            <button onClick={() => setFilter('in progress')} className={`px-3 py-1 rounded-md text-sm font-medium ${filter === 'in progress' ? 'bg-blue-100 text-blue-700' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>In Progress</button>
            <button onClick={() => setFilter('completed')} className={`px-3 py-1 rounded-md text-sm font-medium ${filter === 'completed' ? 'bg-green-100 text-green-700' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>Completed</button>
          </div>
        </div>
        <div className="bg-white shadow rounded-lg overflow-x-auto">
          {jobs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No jobs found.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {jobs.map((job) => (
                <li key={job.id}>
                  <div className="px-4 py-4 sm:px-6 flex items-center justify-between">
                    <div>
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-gray-900">{job.jobType.name}</p>
                        <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>{job.status}</span>
                      </div>
                      <div className="mt-1 flex items-center text-sm text-gray-500">
                        <p>{job.location}</p>
                        <span className="mx-2">•</span>
                        <p>Start: {formatDate(job.startTime)}</p>
                        {job.endTime && <><span className="mx-2">•</span><p>End: {formatDate(job.endTime)}</p></>}
                      </div>
                    </div>
                    <div>
                      <Link href={`/technician/jobs/${job.id}`} className="text-blue-600 hover:text-blue-900 text-sm font-medium">View Details</Link>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
} 