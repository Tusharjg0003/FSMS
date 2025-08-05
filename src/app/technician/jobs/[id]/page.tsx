'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
const SignaturePad = dynamic(() => import('react-signature-canvas'), { ssr: false });

interface Job {
  id: number;
  status: string;
  startTime: string;
  endTime?: string;
  location: string;
  jobType: { id: number; name: string };
  reports?: any[];
}

export default function TechnicianJobDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const jobId = params?.id;
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
    } else if (status === 'authenticated' && session?.user?.role !== 'TECHNICIAN') {
      router.push('/dashboard');
    }
  }, [status, session, router]);

  useEffect(() => {
    if (jobId) fetchJob();
  }, [jobId]);

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
    try {
      // Upload images first
      let imageUrls: string[] = [];
      if (reportImages.length > 0) {
        const uploads = await Promise.all(reportImages.map(async (file) => {
          const formData = new FormData();
          formData.append('file', file);
          const res = await fetch('/api/upload', { method: 'POST', body: formData });
          if (res.ok) {
            const data = await res.json();
            return data.url;
          } else {
            throw new Error('Failed to upload image');
          }
        }));
        imageUrls = uploads;
      }
      // Upload signature if present
      let signatureUrl = '';
      if (signatureData) {
        const blob = await (await fetch(signatureData)).blob();
        const formData = new FormData();
        formData.append('file', new File([blob], `signature-${Date.now()}.png`, { type: 'image/png' }));
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        if (res.ok) {
          const data = await res.json();
          signatureUrl = data.url;
        } else {
          throw new Error('Failed to upload signature');
        }
      }
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
      } else {
        setError('Failed to submit report');
      }
    } catch (error) {
      setError('Error submitting report');
    } finally {
      setSubmitting(false);
    }
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto py-8">
        <Link href="/technician/jobs" className="text-blue-600 hover:text-blue-900 text-sm font-medium">← Back to My Jobs</Link>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">Job Details</h1>
        <div className="bg-white shadow rounded-lg p-6 mt-4">
          <div className="mb-2"><strong>Job Type:</strong> {job.jobType?.name}</div>
          <div className="mb-2"><strong>Status:</strong> {job.status}</div>
          <div className="mb-2"><strong>Location:</strong> {job.location}</div>
          <div className="mb-2"><strong>Start Time:</strong> {job.startTime}</div>
          <div className="mb-2"><strong>End Time:</strong> {job.endTime || 'N/A'}</div>
        </div>
        <form onSubmit={handleStatusUpdate} className="mt-6 space-y-4 bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold">Update Status</h2>
          <select value={statusUpdate} onChange={e => setStatusUpdate(e.target.value)} className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
            <option value="pending">Pending</option>
            <option value="in progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md text-sm font-medium disabled:opacity-50">{submitting ? 'Updating...' : 'Update Status'}</button>
        </form>
        <form onSubmit={handleReportSubmit} className="mt-6 space-y-4 bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold">Submit Completion Report</h2>
          <textarea value={reportNotes} onChange={e => setReportNotes(e.target.value)} placeholder="Notes" className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {imagePreviews.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {imagePreviews.map((src, idx) => (
                <img key={idx} src={src} alt={`Preview ${idx + 1}`} className="w-20 h-20 object-cover rounded border" />
              ))}
            </div>
          )}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Customer Signature</label>
            <div className="bg-gray-100 rounded border p-2 flex flex-col items-center">
              <SignaturePad
                ref={setSignaturePad}
                penColor="black"
                canvasProps={{ width: 300, height: 120, className: 'rounded bg-white border' }}
                onEnd={handleEndSignature}
              />
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={handleClearSignature} className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-3 py-1 rounded text-xs">Clear</button>
              </div>
              {signatureData && (
                <img src={signatureData} alt="Signature preview" className="mt-2 w-40 h-12 object-contain border rounded bg-white" />
              )}
            </div>
          </div>
          <button type="submit" disabled={submitting} className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md text-sm font-medium disabled:opacity-50">{submitting ? 'Submitting...' : 'Submit Report'}</button>
        </form>
        {error && <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}
      </div>
    </div>
  );
} 