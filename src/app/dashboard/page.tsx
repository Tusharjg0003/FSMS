'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import SchedulePage from '../schedule/page';
import React from 'react';
import {  
  Calendar,
} from 'lucide-react';

type Job = {
  id: number;
  status: string;
  startTime: string;
  endTime?: string;
  location: string;
  // Customer/Company Information
  customerName?: string;
  companyName?: string;
  phoneNumber?: string;
  email?: string;
  jobType: {
    id: number;
    name: string;
  };
  technician?: {
    id: number;
    name: string;
    email: string;
  };
};

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const JobsList = () => {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
      setLoading(true);
      const url = statusFilter === 'all' ? '/api/jobs' : `/api/jobs?status=${encodeURIComponent(statusFilter)}`;
      fetch(url)
        .then((res) => res.json())
        .then((data) => setJobs(data))
        .finally(() => setLoading(false));
    }, [statusFilter]);

    const statusOptions = [
      { label: 'All', value: 'all' },
      { label: 'Pending', value: 'pending' },
      { label: 'In Progress', value: 'in progress' },
      { label: 'Completed', value: 'completed' },
      { label: 'Cancelled', value: 'cancelled' },
    ];

    return (
      <div className="mb-8">
        <div className="flex flex-wrap gap-2 mb-4">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`px-3 py-1 rounded-md text-sm font-medium border transition-colors duration-150 ${
                statusFilter === opt.value
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {loading ? (
          <div className="py-8 text-center text-gray-700">Loading jobs...</div>
        ) : !jobs.length ? (
          <div className="py-8 text-center text-gray-600">No jobs found.</div>
        ) : (
          <div className="overflow-x-auto max-h-96 overflow-y-auto bg-white shadow rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Job Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Start</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">End</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Technician</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {jobs.map((job) => (
                  <tr key={job.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{job.jobType?.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{job.status}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        {job.customerName && (
                          <div className="font-medium">{job.customerName}</div>
                        )}
                        {job.companyName && (
                          <div className="text-gray-600 text-xs">{job.companyName}</div>
                        )}
                        {job.phoneNumber && (
                          <div className="text-gray-500 text-xs">📞 {job.phoneNumber}</div>
                        )}
                        {!job.customerName && !job.companyName && !job.phoneNumber && '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{job.location}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{job.startTime ? new Date(job.startTime).toLocaleString() : ''}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{job.endTime ? new Date(job.endTime).toLocaleString() : ''}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{job.technician?.name || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link href={`/jobs/${job.id}`} className="text-blue-600 hover:text-blue-900">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };



  const getRoleBasedContent = () => {
    if (!session?.user) return null;

    switch ((session.user as any).role) {
      case 'ADMIN':
        return (
          <div className='p-5'>
            {/* Hero Section */}
            <div className="relative bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 rounded-2xl p-8 mb-8 text-white overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
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
                    <p className="text-blue-100">Dashboard</p>
                  </div>
                  <Link
                    href="/jobs/create"
                    className="bg-white text-blue-600 hover:bg-blue-50 px-6 py-4 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2 shadow-lg"
                  >
                    <span>Create New Job</span>
                    <Calendar className="h-5 w-5" />
                  </Link>
                </div>
                <SchedulePage/>
              </div>
            </div>

          </div>
        );

        case 'SUPERVISOR':
        return (
          <div>
            {/* Hero Section for Supervisor */}
            <div className="relative bg-gradient-to-r from-green-600 via-green-700 to-emerald-800 rounded-2xl p-8 mb-8 text-white overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h1 className="text-4xl font-bold mb-2">
                      Supervisor Dashboard
                    </h1>
                    <p className="text-green-100 text-lg">
                      Monitor team performance, oversee operations, and ensure quality service delivery.
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 flex-1 border border-white/20">
                    <h3 className="text-lg font-semibold mb-1">Welcome back, {session.user?.name}!</h3>
                    <p className="text-green-100"> Dashboard</p>
                  </div>
                </div>
                <SchedulePage/>
              </div>
            </div>
          </div>
        );
        
      case 'TECHNICIAN':
        React.useEffect(() => {
          router.push('/technician');
        }, [router]);
        
        return (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">Redirecting to technician dashboard...</div>
          </div>
        );

      default:
        return <div>Welcome to the dashboard!</div>;
    }
  };

  return (
    <DashboardLayout>
      {getRoleBasedContent()}
    </DashboardLayout>
  );
}