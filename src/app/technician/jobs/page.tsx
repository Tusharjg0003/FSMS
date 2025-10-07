'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import LocationTracker from '../../../components/LocationTracker';
import TechnicianDashboardLayout from '@/components/TechnicianDashboardLayout';
import { 
  Clock, 
  MapPin, 
  Building,
  User,
  FileText
} from 'lucide-react';

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
  // Customer/Company Information
  customerName?: string;
  clientName?: string; // Keep for backward compatibility
  companyName?: string;
  phoneNumber?: string;
  email?: string;
  description?: string;
  toolsRequired?: string;
}

export default function TechnicianJobsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

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
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  if (status === 'loading' || loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  if (!session || session.user?.role !== 'TECHNICIAN') {
    return null;
  }

  return (
    <TechnicianDashboardLayout>
      <div className=" p-6 overflow-y-auto">

        {/* Jobs Section */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-full">
          {/* Jobs List */}
          <div className="lg:col-span-2 bg-white rounded-xl p-4 shadow-sm overflow-y-auto">
            <div className="space-y-4">
              {jobs.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-500">No jobs found.</p>
                </div>
              ) : (
                jobs.map((job) => (
                  <div
                    key={job.id}
                    onClick={() => setSelectedJob(job)}
                    className={`border rounded-lg p-4 cursor-pointer transition-all relative ${
                      selectedJob?.id === job.id 
                        ? 'border-indigo-500 shadow-md ring-2 ring-indigo-200' 
                        : 'border-slate-200 hover:shadow-sm'
                    } ${
                      job.status.toLowerCase() === 'pending' ? 'border-l-4 border-l-blue-500' :
                      job.status.toLowerCase() === 'in progress' ? 'border-l-4 border-l-amber-500' :
                      job.status.toLowerCase() === 'completed' ? 'border-l-4 border-l-green-500' :
                      'border-l-4 border-l-gray-500'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-xl font-semibold text-slate-900">#{job.id}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        job.status.toLowerCase() === 'pending' ? 'bg-blue-100 text-blue-800' :
                        job.status.toLowerCase() === 'in progress' ? 'bg-amber-100 text-amber-800' :
                        job.status.toLowerCase() === 'completed' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {job.status}
                      </span>
                    </div>

                    <div className="text-sm text-slate-500 mb-3">
                      {formatDate(job.startTime)} {formatTime(job.startTime)}
                      {job.endTime && ` - ${formatTime(job.endTime)}`}
                    </div>

                    <div className="text-sm text-slate-700 mb-3">
                      <div className="font-medium">{job.jobType.name}</div>
                      <div className="flex items-center mt-1">
                        <MapPin size={12} className="mr-1" />
                        {job.location}
                      </div>
                      {/* Customer Information */}
                      {(job.customerName || job.clientName || job.companyName) && (
                        <div className="mt-2 text-xs text-slate-600">
                          <div className="flex items-center">
                            <User size={12} className="mr-1" />
                            <span className="font-medium">
                              {job.customerName || job.clientName}
                              {job.companyName && ` (${job.companyName})`}
                            </span>
                          </div>
                          {job.phoneNumber && (
                            <div className="flex items-center mt-1">
                              <span className="text-xs">📞 {job.phoneNumber}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <Link
                      href={`/technician/jobs/${job.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-slate-500 hover:text-indigo-600 text-sm"
                    >
                      View Details
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Job Details */}
          <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm">
            {selectedJob ? (
              <div>
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-200">
                  <h2 className="text-2xl font-semibold text-slate-900">Job #{selectedJob.id}</h2>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    selectedJob.status.toLowerCase() === 'pending' ? 'bg-blue-100 text-blue-800' :
                    selectedJob.status.toLowerCase() === 'in progress' ? 'bg-amber-100 text-amber-800' :
                    selectedJob.status.toLowerCase() === 'completed' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedJob.status}
                  </span>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center space-x-2 text-slate-600 mb-8">
                    <Clock size={16} />
                    <span>
                      {formatDate(selectedJob.startTime)} {formatTime(selectedJob.startTime)}
                      {selectedJob.endTime && ` - ${formatTime(selectedJob.endTime)}`}
                    </span>
                  </div>

                  <div>
                    <label className="block text-lg font-semibold text-slate-900 mb-2">Address:</label>
                    <p className="text-slate-600">{selectedJob.location}</p>
                  </div>

                  {/* Customer Information */}
                  {(selectedJob.customerName || selectedJob.clientName || selectedJob.companyName || selectedJob.phoneNumber || selectedJob.email) && (
                    <div>
                      <label className="block text-lg font-semibold text-slate-900 mb-2">Customer Information:</label>
                      <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                        {(selectedJob.customerName || selectedJob.clientName) && (
                          <div className="flex items-center">
                            <User size={16} className="mr-2 text-slate-500" />
                            <span className="text-slate-700 font-medium">
                              {selectedJob.customerName || selectedJob.clientName}
                            </span>
                          </div>
                        )}
                        {selectedJob.companyName && (
                          <div className="flex items-center">
                            <Building size={16} className="mr-2 text-slate-500" />
                            <span className="text-slate-700">{selectedJob.companyName}</span>
                          </div>
                        )}
                        {selectedJob.phoneNumber && (
                          <div className="flex items-center">
                            <span className="mr-2">📞</span>
                            <span className="text-slate-700">{selectedJob.phoneNumber}</span>
                          </div>
                        )}
                        {selectedJob.email && (
                          <div className="flex items-center">
                            <span className="mr-2">✉️</span>
                            <span className="text-slate-700">{selectedJob.email}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-lg font-semibold text-slate-900 mb-2">Job Type:</label>
                    <p className="text-slate-600">{selectedJob.jobType.name}</p>
                  </div>

                  {selectedJob.description && (
                    <div>
                      <label className="block text-lg font-semibold text-slate-900 mb-2">Description:</label>
                      <p className="text-slate-600 leading-relaxed">{selectedJob.description}</p>
                    </div>
                  )}

                  {selectedJob.toolsRequired && (
                    <div>
                      <label className="block text-lg font-semibold text-slate-900 mb-2">Tools Required:</label>
                      <p className="text-slate-600">{selectedJob.toolsRequired}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex space-x-4 pt-12 border-t border-slate-200">
                    <Link
                      href={`/technician/jobs/${selectedJob.id}`}
                      className="bg-indigo-600 text-white px-5 py-3 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
                    >
                      <FileText size={16} />
                      <span>Full Details & Report</span>
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <h2 className="text-2xl font-semibold text-slate-900 mb-4">Select a Job</h2>
                <p className="text-slate-600">Please select a job from the list to view details.</p>
              </div>
            )}
          </div>

          {/* Location Tracking Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl p-4 shadow-sm h-fit">
              <LocationTracker 
                showHistory={false}
                autoTrack={true}
              />
            </div>
          </div>
        </div>
      </div>
    </TechnicianDashboardLayout>
  );
}