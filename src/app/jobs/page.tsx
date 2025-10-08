'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { IconX, IconUser, IconMapPin, IconClock, IconClipboardList, IconEye } from '@tabler/icons-react';
import { get } from 'http';

interface Job {
  id: number;
  status: string;
  startTime: string;
  endTime?: string;
  location: string;
  jobTypeName?: string;
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
  reports?: any[];
}

export default function JobsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showVisualizationLink, setShowVisualizationLink] = useState(false);
  const [autoAssignedJobId, setAutoAssignedJobId] = useState<string | null>(null);


  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  // Handle URL parameters for success messages and visualization
  useEffect(() => {
    const message = searchParams.get('message');
    const jobId = searchParams.get('jobId');
    const autoAssigned = searchParams.get('autoAssigned');
    
    if (message) {
      setSuccessMessage(message);
      if (autoAssigned === 'true' && jobId) {
        setShowVisualizationLink(true);
        setAutoAssignedJobId(jobId);
      }
      
      // Clear message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null);
        setShowVisualizationLink(false);
        setAutoAssignedJobId(null);
      }, 5000);
    }
  }, [searchParams]);

  useEffect(() => {
    if (session) {
      fetchJobs();
    }
  }, [session, filter]);

  const fetchJobs = async () => {
    try {
      const url = filter === 'all' ? '/api/jobs' : `/api/jobs?status=${filter}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setJobs(data);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchJobDetails = async (jobId: number) => {
    setModalLoading(true);
    try {
      const response = await fetch(`/api/jobs/${jobId}`);
      if (response.ok) {
        const jobData = await response.json();
        setSelectedJob(jobData);
      }
    } catch (error) {
      console.error('Error fetching job details:', error);
    } finally {
      setModalLoading(false);
    }
  };

  const handleViewDetails = (job: Job) => {
    setIsModalOpen(true);
    fetchJobDetails(job.id);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedJob(null);
  };

  // Helper function to get the display name for job type
  const getJobTypeDisplayName = (job: Job): string => {
    // Always use the historical snapshot if it exists
    return job.jobTypeName || job.jobType?.name || 'Unknown Job Type';
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
    return new Date(dateString).toLocaleDateString('en-MY', {
      timeZone: 'Asia/Kuala_Lumpur',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className={`min-h-screen transition-all duration-300 ${isModalOpen ? 'filter blur-md' : ''}`}>
        <div className="mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Jobs</h1>
                <p className="mt-1 text-sm text-gray-600">
                  Manage and track field service jobs
                </p>
              </div>
              {(session?.user as any)?.role === 'ADMIN' && (
                <Link
                  href="/jobs/create"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Create New Job
                </Link>
              )}
            </div>

            {/* Success Message and Visualization Link */}
            {successMessage && (
              <div className="mb-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-medium text-green-800">{successMessage}</p>
                      {showVisualizationLink && autoAssignedJobId && (
                        <div className="mt-2">
                          <Link
                            href={`/jobs/auto-assign-visualization?jobId=${autoAssignedJobId}`}
                            className="inline-flex items-center px-3 py-1 border border-green-300 rounded-md text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 transition-colors"
                          >
                            <IconEye className="h-3 w-3 mr-1" />
                            View Auto-Assignment Process
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="mb-6">
              <div className="flex space-x-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1 rounded-md text-sm font-medium ${
                    filter === 'all'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter('pending')}
                  className={`px-3 py-1 rounded-md text-sm font-medium ${
                    filter === 'pending'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Pending
                </button>
                <button
                  onClick={() => setFilter('in progress')}
                  className={`px-3 py-1 rounded-md text-sm font-medium ${
                    filter === 'in progress'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  In Progress
                </button>
                <button
                  onClick={() => setFilter('completed')}
                  className={`px-3 py-1 rounded-md text-sm font-medium ${
                    filter === 'completed'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Completed
                </button>
              </div>
            </div>

            {/* Jobs List */}
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              {jobs.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No jobs found.</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {jobs.map((job) => {
                    const displayName = getJobTypeDisplayName(job);
                    return (
                      <li key={job.id}>
                        <div className="px-4 py-4 sm:px-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="flex-shrink-0">
                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                  <span className="text-blue-600 font-medium">
                                    {displayName.charAt(0)}
                                  </span> 
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="flex items-center">
                                  <p className="text-sm font-medium text-gray-900">
                                    {displayName}
                                  </p>
                                  <span
                                    className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                                      job.status
                                    )}`}
                                  >
                                    {job.status}
                                  </span>
                                </div>
                                <div className="mt-1 flex items-center text-sm text-gray-500">
                                  <p>{job.location}</p>
                                  <span className="mx-2">-</span>
                                  <p>Start: {formatDate(job.startTime)}</p>
                                  {job.endTime && (
                                    <>
                                      <span className="mx-2">-</span>
                                      <p>End: {formatDate(job.endTime)}</p>
                                    </>
                                  )}
                                </div>
                                {/* Customer Information */}
                                {(job.customerName || job.companyName) && (
                                  <div className="mt-1 text-sm text-gray-500">
                                    <span className="font-medium text-gray-700">
                                      {job.customerName}
                                      {job.companyName && ` (${job.companyName})`}
                                    </span>
                                    {job.phoneNumber && (
                                      <>
                                        <span className="mx-2">-</span>
                                        <span>{job.phoneNumber}</span>
                                      </>
                                    )}
                                  </div>
                                )}
                                {job.technician && (
                                  <div className="mt-1 text-sm text-gray-500">
                                    Assigned to: {job.technician.name}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleViewDetails(job)}
                                className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                              >
                                View Details
                              </button>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Overlay */}
      <AnimatePresence>
        {selectedJob && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white/10 backdrop-blur-xl flex items-center justify-center p-4 z-50"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {modalLoading ? (
                <div className="p-8 flex items-center justify-center">
                  <div className="text-lg">Loading job details...</div>
                </div>
              ) : (
                <>
                  {/* Modal Header */}
                  <div className="sticky top-0 bg-white rounded-t-2xl border-b border-gray-200 p-6 flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        Job #{selectedJob.id}
                      </h2>
                      <p className="text-gray-600">{getJobTypeDisplayName(selectedJob)}</p>
                    </div>
                    <button
                      onClick={closeModal}
                      className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <IconX className="h-6 w-6 text-gray-500" />
                    </button>
                  </div>

                  {/* Modal Content */}
                  <div className="p-6">
                    {/* Job Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <IconClipboardList className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Status</p>
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedJob.status)}`}>
                              {selectedJob.status}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-100 rounded-lg">
                            <IconMapPin className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Location</p>
                            <p className="font-semibold text-gray-900">{selectedJob.location}</p>
                          </div>
                        </div>

                        {selectedJob.technician && (
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 rounded-lg">
                              <IconUser className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Technician</p>
                              <p className="font-semibold text-gray-900">{selectedJob.technician.name}</p>
                              <p className="text-sm text-gray-600">{selectedJob.technician.email}</p>
                            </div>
                          </div>
                        )}

                        {/* Customer Information */}
                        {(selectedJob.customerName || selectedJob.companyName || selectedJob.phoneNumber || selectedJob.email) && (
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-100 rounded-lg">
                              <IconUser className="h-5 w-5 text-indigo-600" />
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Customer</p>
                              {selectedJob.customerName && (
                                <p className="font-semibold text-gray-900">{selectedJob.customerName}</p>
                              )}
                              {selectedJob.companyName && (
                                <p className="text-sm text-gray-600">{selectedJob.companyName}</p>
                              )}
                              {selectedJob.phoneNumber && (
                                <p className="text-sm text-gray-600">Phone: {selectedJob.phoneNumber}</p>
                              )}
                              {selectedJob.email && (
                                <p className="text-sm text-gray-600">Email: {selectedJob.email}</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-orange-100 rounded-lg">
                            <IconClock className="h-5 w-5 text-orange-600" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Start Time</p>
                            <p className="font-semibold text-gray-900">{formatDate(selectedJob.startTime)}</p>
                          </div>
                        </div>

                        {selectedJob.endTime && (
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-100 rounded-lg">
                              <IconClock className="h-5 w-5 text-red-600" />
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">End Time</p>
                              <p className="font-semibold text-gray-900">{formatDate(selectedJob.endTime)}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Reports Section */}
                    {selectedJob.reports && selectedJob.reports.length > 0 && (
                      <div className="border-t border-gray-200 pt-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Submitted Reports</h3>
                        <div className="space-y-6">
                          {selectedJob.reports.map((report: any, idx: number) => (
                            <div key={report.id} className="bg-gray-50 rounded-lg p-4">
                              <div className="mb-3 text-sm text-gray-600">
                                Submitted by <span className="font-medium">{report.user?.name}</span> on {new Date(report.submissionDate).toLocaleString()}
                              </div>
                              
                              <div className="mb-3">
                                <h4 className="font-semibold text-gray-900 mb-1">Notes:</h4>
                                <p className="text-gray-700">{report.notes}</p>
                              </div>
                              
                              {report.images && JSON.parse(report.images).length > 0 && (
                                <div className="mb-3">
                                  <h4 className="font-semibold text-gray-900 mb-2">Images:</h4>
                                  <div className="flex flex-wrap gap-2">
                                    {JSON.parse(report.images).map((img: string, i: number) => (
                                      <img 
                                        key={i} 
                                        src={img} 
                                        alt={`Report image ${i + 1}`} 
                                        className="w-20 h-20 object-cover rounded border hover:scale-105 transition-transform cursor-pointer" 
                                      />
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {report.signature && (
                                <div>
                                  <h4 className="font-semibold text-gray-900 mb-2">Customer Signature:</h4>
                                  <img 
                                    src={report.signature} 
                                    alt="Signature" 
                                    className="w-40 h-12 object-contain border rounded bg-white" 
                                  />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}