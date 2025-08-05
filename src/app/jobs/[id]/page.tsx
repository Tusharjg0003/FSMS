'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function JobDetailPage() {
  const params = useParams();
  const id = params?.id;
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchJob() {
      const res = await fetch(`/api/jobs/${id}`);
      if (res.ok) setJob(await res.json());
      setLoading(false);
    }
    if (id) fetchJob();
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!job) return <div className="min-h-screen flex items-center justify-center">Job not found.</div>;

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Job Details</h1>
      <div className="bg-white shadow rounded p-6 mb-8">
        <div className="mb-2"><strong>Job Type:</strong> {job.jobType?.name}</div>
        <div className="mb-2"><strong>Status:</strong> {job.status}</div>
        <div className="mb-2"><strong>Location:</strong> {job.location}</div>
        <div className="mb-2"><strong>Start Time:</strong> {job.startTime}</div>
        <div className="mb-2"><strong>End Time:</strong> {job.endTime || 'N/A'}</div>
        {job.technician && (
          <div className="mb-2"><strong>Technician:</strong> {job.technician.name}</div>
        )}
      </div>
      {job.reports && job.reports.length > 0 && (
        <div className="bg-white shadow rounded p-6">
          <h2 className="text-lg font-bold mb-4">Submitted Reports</h2>
          {job.reports.map((report: any, idx: number) => (
            <div key={report.id} className="mb-8 border-b pb-6 last:border-b-0 last:pb-0">
              <div className="mb-2 text-sm text-gray-500">Submitted by {report.user?.name} ({report.user?.email}) on {new Date(report.submissionDate).toLocaleString()}</div>
              <div className="mb-2"><strong>Notes:</strong> {report.notes}</div>
              {report.images && JSON.parse(report.images).length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {JSON.parse(report.images).map((img: string, i: number) => (
                    <img key={i} src={img} alt={`Report image ${i + 1}`} className="w-20 h-20 object-cover rounded border" />
                  ))}
                </div>
              )}
              {report.signature && (
                <div className="mb-2">
                  <strong>Customer Signature:</strong>
                  <div className="mt-1">
                    <img src={report.signature} alt="Signature" className="w-40 h-12 object-contain border rounded bg-white" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 