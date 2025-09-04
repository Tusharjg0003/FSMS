'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import TechnicianDashboardLayout from '@/components/TechnicianDashboardLayout';


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
    <TechnicianDashboardLayout>
      <div className="p-6">
        {/* Hero Section */}
        <div className="relative bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 rounded-2xl p-8 mb-8 text-white overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-26"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full "></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-4xl font-bold mb-2">
                  Field Service Management System
                </h1>
                <p className="text-blue-100 text-lg">
                  Easily schedule jobs, assign technicians, and keep track of everything in real time.
                </p>
              </div>
              <div className="hidden lg:block">
                <div className="w-24 h-24 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/30">
                  <span className="text-3xl font-bold">FSMS</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 flex-1 border border-white/20">
                <h3 className="text-lg font-semibold mb-1">Welcome back, {session.user?.name}!</h3>
                <p className="text-blue-100"> Dashboard</p>
              </div>
            </div>
          </div>
        </div>
        {/* <h1 className="text-3xl font-bold text-gray-900 mb-8">My Jobs</h1>
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
         */}
      </div>

    </TechnicianDashboardLayout>
    
  );
} 