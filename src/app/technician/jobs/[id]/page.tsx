'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import TechnicianDashboardLayout from '@/components/TechnicianDashboardLayout';
import { 
  ArrowLeft,
  Clock,
  MapPin,
  Building,
  User,
  FileText,
  Camera,
  Check,
  X
} from 'lucide-react';

const SignaturePad = dynamic(() => import('react-signature-canvas'), { ssr: false });

interface Job {
  id: number;
  status: string;
  startTime: string;
  endTime?: string;
  location: string;
  jobType: { id: number; name: string };
  reports?: any[];
  // Customer/Company Information
  customerName?: string;
  clientName?: string; // Keep for backward compatibility
  companyName?: string;
  phoneNumber?: string;
  email?: string;
  description?: string;
  toolsRequired?: string;
}

export default function TechnicianJobDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const jobId = params?.id;
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [statusUpdate, setStatusUpdate] = useState('');
  const [reportNotes, setReportNotes] = useState('');
  const [reportImages, setReportImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [signaturePad, setSignaturePad] = useState<any>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && (session?.user as any)?.role !== 'TECHNICIAN') {
      router.push('/dashboard');
    }
  }, [status, session, router]);

  useEffect(() => {
    if (jobId) fetchJob();
  }, [jobId]);

  //Check if status updates should be allowed (happens when tech mark the task completed)
  const canUpdateStatus = job ? job.status.toLowerCase() !== 'completed' : false;

  const fetchJob = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}`);
      if (res.ok) {
        const data = await res.json();
        setJob(data);
        setStatusUpdate(data.status);
      } else {
        setError('Job not found');
      }
    } catch (error) {
      setError('Error fetching job');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`/api/jobs/${jobId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: statusUpdate }),
      });
      if (res.ok) {
        fetchJob();
      } else {
        setError('Failed to update status');
      }
    } catch (error) {
      setError('Error updating status');
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 6);
    setReportImages(files);
    setImagePreviews(files.map(file => URL.createObjectURL(file)));
  };

  const handleClearSignature = () => {
    if (signaturePad) {
      signaturePad.clear();
      setSignatureData(null);
    }
  };

  const handleEndSignature = () => {
    if (signaturePad && !signaturePad.isEmpty()) {
      setSignatureData(signaturePad.getTrimmedCanvas().toDataURL('image/png'));
    }
  };

  const handleReportSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');
    
    console.log('Report submission started:', {
      jobId,
      hasNotes: !!reportNotes,
      notesLength: reportNotes.length,
      imagesCount: reportImages.length,
      hasSignature: !!signatureData
    });
    
    try {
      // Upload images first
      let imageUrls: string[] = [];
      if (reportImages.length > 0) {
        console.log('Uploading images...');
        const uploads = await Promise.all(reportImages.map(async (file) => {
          const formData = new FormData();
          formData.append('file', file);
          const res = await fetch('/api/upload', { method: 'POST', body: formData });
          if (res.ok) {
            const data = await res.json();
            console.log('Image uploaded:', data.url);
            return data.url;
          } else {
            const errorData = await res.json();
            console.error('Image upload failed:', errorData);
            throw new Error(`Failed to upload image: ${errorData.error || 'Unknown error'}`);
          }
        }));
        imageUrls = uploads;
      }
      
      // Upload signature if present
      let signatureUrl = '';
      if (signatureData) {
        console.log('Uploading signature...');
        const blob = await (await fetch(signatureData)).blob();
        const formData = new FormData();
        formData.append('file', new File([blob], `signature-${Date.now()}.png`, { type: 'image/png' }));
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        if (res.ok) {
          const data = await res.json();
          console.log('Signature uploaded:', data.url);
          signatureUrl = data.url;
        } else {
          const errorData = await res.json();
          console.error('Signature upload failed:', errorData);
          throw new Error(`Failed to upload signature: ${errorData.error || 'Unknown error'}`);
        }
      }
      
      console.log('Submitting report with data:', {
        notes: reportNotes,
        images: imageUrls,
        signature: signatureUrl
      });
      
      const res = await fetch(`/api/jobs/${jobId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: reportNotes, images: imageUrls, signature: signatureUrl }),
      });
      if (res.ok) {
        setReportNotes('');
        setReportImages([]);
        setImagePreviews([]);
        setSignatureData(null);
        if (signaturePad) signaturePad.clear();
        fetchJob();
        setError(''); // Clear any previous errors
        setSuccess('Report submitted successfully!');
        // Auto-hide success message after 5 seconds
        setTimeout(() => setSuccess(''), 5000);
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'Failed to submit report');
        console.error('Report submission failed:', errorData);
      }
    } catch (error) {
      console.error('Report submission error:', error);
      setError(`Error submitting report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const addImage = () => {
    document.getElementById('image-upload')?.click();
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
  
  if (!job) {
    return <div className="min-h-screen flex items-center justify-center">Job not found.</div>;
  }

  return (
    <TechnicianDashboardLayout>
      <div className="flex-1 p-6 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-6">
          <Link 
            href="/technician/jobs" 
            className="flex items-center space-x-2 text-slate-600 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Back to Jobs</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Job Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job Information Card */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200">
                <h1 className="text-3xl font-bold text-slate-900">Job #{job.id}</h1>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  job.status.toLowerCase() === 'pending' ? 'bg-blue-100 text-blue-800' :
                  job.status.toLowerCase() === 'in progress' ? 'bg-amber-100 text-amber-800' :
                  job.status.toLowerCase() === 'completed' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {job.status}
                </span>
              </div>

              <div className="space-y-6">
                <div className="flex items-center space-x-2 text-slate-600">
                  <Clock size={16} />
                  <span>
                    {formatDate(job.startTime)} {formatTime(job.startTime)}
                    {job.endTime && ` - ${formatTime(job.endTime)}`}
                  </span>
                </div>

                <div>
                  <label className="block text-lg font-semibold text-slate-900 mb-2">Address:</label>
                  <div className="flex items-start space-x-2 text-slate-600">
                    <MapPin size={16} className="mt-1 flex-shrink-0" />
                    <p>{job.location}</p>
                  </div>
                </div>

                {/* Customer Information */}
                {(job.customerName || job.clientName || job.companyName || job.phoneNumber || job.email) && (
                  <div>
                    <label className="block text-lg font-semibold text-slate-900 mb-2">Customer Information:</label>
                    <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                      {(job.customerName || job.clientName) && (
                        <div className="flex items-center space-x-2 text-slate-700">
                          <User size={16} />
                          <span className="font-medium">{job.customerName || job.clientName}</span>
                        </div>
                      )}
                      {job.companyName && (
                        <div className="flex items-center space-x-2 text-slate-700">
                          <Building size={16} />
                          <span>{job.companyName}</span>
                        </div>
                      )}
                      {job.phoneNumber && (
                        <div className="flex items-center space-x-2 text-slate-700">
                          <span>📞</span>
                          <span>{job.phoneNumber}</span>
                        </div>
                      )}
                      {job.email && (
                        <div className="flex items-center space-x-2 text-slate-700">
                          <span>✉️</span>
                          <span>{job.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-lg font-semibold text-slate-900 mb-2">Job Type:</label>
                  <p className="text-slate-600">{job.jobType?.name}</p>
                </div>

                {job.description && (
                  <div>
                    <label className="block text-lg font-semibold text-slate-900 mb-2">Description:</label>
                    <p className="text-slate-600 leading-relaxed">{job.description}</p>
                  </div>
                )}

                {job.toolsRequired && (
                  <div>
                    <label className="block text-lg font-semibold text-slate-900 mb-2">Tools Required:</label>
                    <p className="text-slate-600">{job.toolsRequired}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Status Update Card - Only show if job is NOT completed */}
            {canUpdateStatus && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">Update Status</h2>
                <form onSubmit={handleStatusUpdate} className="space-y-4">
                  <select 
                    value={statusUpdate} 
                    onChange={e => setStatusUpdate(e.target.value)} 
                    className="block w-full border-slate-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 px-4 py-2 text-gray-700"
                  >
                    <option value="pending">Pending</option>
                    <option value="in progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <button 
                    type="submit" 
                    disabled={submitting}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg font-medium disabled:opacity-50 transition-colors"
                  >
                    {submitting ? 'Updating...' : 'Update Status'}
                  </button>
                </form>
              </div>
            )}

            {/*Show message when job is completed */}
            {!canUpdateStatus && (
              <div className="bg-green-50 rounded-xl p-6 shadow-sm border border-green-200">
                <div className="flex items-center space-x-2">
                  <Check size={20} className="text-green-600" />
                  <h2 className="text-xl font-semibold text-green-900">Job Completed</h2>
                </div>
                <p className="text-green-700 mt-2">
                  This job has been marked as completed. You can still submit additional reports if needed.
                </p>
              </div>
            )}

            {/* Completion Report Card */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Submit Completion Report</h2>
              <form onSubmit={handleReportSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-black mb-2">Report Notes</label>
                  <textarea 
                    value={reportNotes} 
                    onChange={e => setReportNotes(e.target.value)} 
                    placeholder="Add your completion notes here..."
                    rows={4}
                    className="block w-full border-slate-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 px-4 py-2"
                  />
                </div>

                {/* Image Upload Section */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-4">Upload Images</label>
                  

                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={addImage}
                      className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-200 transition-colors flex items-center space-x-2 border border-slate-200"
                    >
                      <Camera size={16} />
                      <span>Add Images</span>
                    </button>
                  </div>

                  {imagePreviews.length > 0 && (
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-4">
                      {imagePreviews.map((src, idx) => (
                        <img 
                          key={idx} 
                          src={src} 
                          alt={`Preview ${idx + 1}`} 
                          className="w-full h-20 object-cover rounded border"
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Signature Section */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Customer Signature</label>
                  <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 flex flex-col items-center">
                    <SignaturePad
                      ref={setSignaturePad}
                      penColor="black"
                      canvasProps={{ width: 300, height: 120, className: 'rounded bg-white border' }}
                      onEnd={handleEndSignature}
                    />
                    <div className="flex gap-2 mt-2">
                      <button 
                        type="button" 
                        onClick={handleClearSignature} 
                        className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1 rounded text-sm transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                    {signatureData && (
                      <img 
                        src={signatureData} 
                        alt="Signature preview" 
                        className="mt-2 w-40 h-12 object-contain border rounded bg-white"
                      />
                    )}
                  </div>
                </div>

                <div className="flex space-x-4">
                  <button 
                    type="submit" 
                    disabled={submitting}
                    className="bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg font-medium disabled:opacity-50 transition-colors flex items-center space-x-2"
                  >
                    <Check size={16} />
                    <span>{submitting ? 'Submitting...' : 'Submit Report'}</span>
                  </button>
                </div>
                
                {/* Success Message */}
                {success && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center">
                      <Check className="h-5 w-5 text-green-600 mr-2" />
                      <p className="text-green-800 font-medium">{success}</p>
                    </div>
                  </div>
                )}
                
                {/* Error Message */}
                {error && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center">
                      <X className="h-5 w-5 text-red-600 mr-2" />
                      <p className="text-red-800">{error}</p>
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* Reports Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Previous Reports</h3>
              {job.reports && job.reports.length > 0 ? (
                <div className="space-y-4">
                  {job.reports.map((report: any, index: number) => (
                    <div key={index} className="border border-slate-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <FileText size={16} className="text-slate-500" />
                        <span className="text-sm font-medium text-slate-900">Report #{index + 1}</span>
                      </div>
                      {report.notes && (
                        <p className="text-sm text-slate-600 mb-2">{report.notes}</p>
                      )}
                      {report.images && report.images.length > 0 && (
                        <div className="text-sm text-slate-500">
                          {report.images.length} image(s) attached
                        </div>
                      )}
                      {report.signature && (
                        <div className="text-sm text-slate-500">
                          Customer signature included
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm">No reports submitted yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
      </div>
    </TechnicianDashboardLayout>
  );
}