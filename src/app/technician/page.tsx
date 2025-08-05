'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Job {
  id: number;
  status: string;
  startTime: string;
  endTime?: string;
  location: string;
  jobType: { id: number; name: string };
}

export default function TechnicianDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

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
  }, [session]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/jobs');
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

  if (status === 'loading' || loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  if (!session || session.user?.role !== 'TECHNICIAN') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-100">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">FSM Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/technician/profile" className="text-gray-700 hover:text-blue-600 text-xl" title="Profile & Settings">
                <span role="img" aria-label="profile">👤</span>
              </Link>
              <span className="text-sm text-gray-700">
                Welcome, {session.user.name} (TECHNICIAN)
              </span>
              <button
                onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>
      <div className="max-w-4xl mx-auto py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Jobs</h1>
        <div className="bg-white shadow rounded-lg overflow-x-auto">
          {jobs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No jobs assigned.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {jobs.map((job) => (
                <li key={job.id}>
                  <div className="px-4 py-4 sm:px-6 flex items-center justify-between">
                    <div>
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-gray-900">{job.jobType.name}</p>
                        <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${job.status === 'completed' ? 'bg-green-100 text-green-800' : job.status === 'in progress' ? 'bg-blue-100 text-blue-800' : job.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-800'}`}>{job.status}</span>
                      </div>
                      <div className="mt-1 flex items-center text-sm text-gray-500">
                        <p>{job.location}</p>
                        <span className="mx-2">•</span>
                        <p>Start: {new Date(job.startTime).toLocaleString()}</p>
                        {job.endTime && <><span className="mx-2">•</span><p>End: {new Date(job.endTime).toLocaleString()}</p></>}
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