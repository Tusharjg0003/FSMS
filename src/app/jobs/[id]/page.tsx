// 'use client';

// import { useEffect, useState } from 'react';
// import { useParams } from 'next/navigation';

// export default function JobDetailPage() {
//   const params = useParams();
//   const id = params?.id;
//   const [job, setJob] = useState<any>(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     async function fetchJob() {
//       const res = await fetch(`/api/jobs/${id}`);
//       if (res.ok) setJob(await res.json());
//       setLoading(false);
//     }
//     if (id) fetchJob();
//   }, [id]);

//   if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
//   if (!job) return <div className="min-h-screen flex items-center justify-center">Job not found.</div>;

//   return (
//     <div className="max-w-2xl mx-auto py-8">
//       <h1 className="text-2xl font-bold mb-4">Job Details</h1>
//       <div className="bg-white shadow rounded p-6 mb-8">
//         <div className="mb-2"><strong>Job Type:</strong> {job.jobType?.name}</div>
//         <div className="mb-2"><strong>Status:</strong> {job.status}</div>
//         <div className="mb-2"><strong>Location:</strong> {job.location}</div>
//         <div className="mb-2"><strong>Start Time:</strong> {job.startTime}</div>
//         <div className="mb-2"><strong>End Time:</strong> {job.endTime || 'N/A'}</div>
//         {job.technician && (
//           <div className="mb-2"><strong>Technician:</strong> {job.technician.name}</div>
//         )}
//       </div>
//       {job.reports && job.reports.length > 0 && (
//         <div className="bg-white shadow rounded p-6">
//           <h2 className="text-lg font-bold mb-4">Submitted Reports</h2>
//           {job.reports.map((report: any, idx: number) => (
//             <div key={report.id} className="mb-8 border-b pb-6 last:border-b-0 last:pb-0">
//               <div className="mb-2 text-sm text-gray-500">Submitted by {report.user?.name} ({report.user?.email}) on {new Date(report.submissionDate).toLocaleString()}</div>
//               <div className="mb-2"><strong>Notes:</strong> {report.notes}</div>
//               {report.images && JSON.parse(report.images).length > 0 && (
//                 <div className="mb-2 flex flex-wrap gap-2">
//                   {JSON.parse(report.images).map((img: string, i: number) => (
//                     <img key={i} src={img} alt={`Report image ${i + 1}`} className="w-20 h-20 object-cover rounded border" />
//                   ))}
//                 </div>
//               )}
//               {report.signature && (
//                 <div className="mb-2">
//                   <strong>Customer Signature:</strong>
//                   <div className="mt-1">
//                     <img src={report.signature} alt="Signature" className="w-40 h-12 object-contain border rounded bg-white" />
//                   </div>
//                 </div>
//               )}
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// } 




'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';

export default function JobDetailPage() {
  const params = useParams();
  const id = params?.id as string | undefined;

  const { data: session } = useSession();
  const isManager =
    (session?.user as any)?.role === 'ADMIN' ||
    (session?.user as any)?.role === 'SUPERVISOR';

  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Reschedule / Reassign state
  const [start, setStart] = useState<string>('');
  const [end, setEnd] = useState<string>('');
  const [techId, setTechId] = useState<string>('');
  const [saveError, setSaveError] = useState<string>('');
  const [saveConflicts, setSaveConflicts] = useState<any[]>([]);

  useEffect(() => {
    async function fetchJob() {
      const res = await fetch(`/api/jobs/${id}`);
      if (res.ok) {
        const j = await res.json();
        setJob(j);
        setStart(j.startTime ? new Date(j.startTime).toISOString().slice(0, 16) : '');
        setEnd(j.endTime ? new Date(j.endTime).toISOString().slice(0, 16) : '');
        setTechId(j.technician?.id ? String(j.technician.id) : '');
      }
      setLoading(false);
    }
    if (id) fetchJob();
  }, [id]);

  async function save() {
    setSaveError('');
    setSaveConflicts([]);

    const payload: any = {
      startTime: start ? new Date(start).toISOString() : undefined,
      endTime: end ? new Date(end).toISOString() : null,
      technicianId: techId ? Number(techId) : null,
    };

    const res = await fetch(`/api/jobs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.status === 409) {
      const d = await res.json();
      setSaveError(d.error || 'Scheduling conflict');
      setSaveConflicts(d.conflicts || []);
      return;
    }

    if (!res.ok) {
      const d = await res.json();
      setSaveError(d.error || 'Failed to update');
      return;
    }

    const j = await res.json();
    setJob(j);
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-lg">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }
  
  if (!job) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-lg">Job not found.</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link
            href="/jobs"
            className="text-blue-600 hover:text-blue-900 text-sm font-medium"
          >
            ← Back to Jobs
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-8">Job Details</h1>

        {/* Job summary */}
        <div className="bg-white shadow-lg rounded-xl p-8 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Job Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="font-medium text-gray-700">Job Type:</span>
                <span className="text-gray-900">{job.jobType?.name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="font-medium text-gray-700">Status:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  job.status === 'completed' ? 'bg-green-100 text-green-800' :
                  job.status === 'in progress' ? 'bg-blue-100 text-blue-800' :
                  job.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {job.status}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="font-medium text-gray-700">Location:</span>
                <span className="text-gray-900 text-right">{job.location}</span>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="font-medium text-gray-700">Start Time:</span>
                <span className="text-gray-900">{new Date(job.startTime).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="font-medium text-gray-700">End Time:</span>
                <span className="text-gray-900">
                  {job.endTime ? new Date(job.endTime).toLocaleString() : 'N/A'}
                </span>
              </div>
              {job.technician && (
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="font-medium text-gray-700">Technician:</span>
                  <span className="text-gray-900">{job.technician.name}</span>
                </div>
              )}
            </div>
          </div>
        </div>

{/* not too sure the uses of this part */}
        {/* Reschedule / Reassign (Admin & Supervisor only) */}
        {/* {isManager && (
          <div className="bg-white shadow-lg rounded-xl p-8 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Reschedule / Reassign</h2>

            {saveError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <div className="mt-2 text-sm text-red-700">
                      {saveError}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {saveConflicts.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">Scheduling Conflicts</h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <ul className="list-disc ml-5 space-y-1">
                        {saveConflicts.map((c) => (
                          <li key={c.id}>
                            Job #{c.id} • {new Date(c.startTime).toLocaleString()} –{' '}
                            {c.endTime ? new Date(c.endTime).toLocaleString() : 'N/A'} • {c.status}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Start Time</label>
                <input
                  type="datetime-local"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">End Time</label>
                <input
                  type="datetime-local"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Technician ID</label>
                <input
                  type="number"
                  value={techId}
                  onChange={(e) => setTechId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Leave blank to unassign"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={save}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        )} */}

        {/* Submitted Reports */}
        {job.reports && job.reports.length > 0 && (
          <div className="bg-white shadow-lg rounded-xl p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Submitted Reports</h2>
            <div className="space-y-8">
              {job.reports.map((report: any) => (
                <div
                  key={report.id}
                  className="border-b border-gray-200 pb-8 last:border-b-0 last:pb-0"
                >
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="text-sm text-gray-600">
                      Submitted by <span className="font-medium text-gray-900">{report.user?.name}</span> 
                      <span className="text-gray-500"> ({report.user?.email})</span> on{' '}
                      <span className="font-medium text-gray-900">
                        {new Date(report.submissionDate).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Notes:</h3>
                    <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{report.notes}</p>
                  </div>

                  {report.images && JSON.parse(report.images).length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Images:</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {JSON.parse(report.images).map((img: string, i: number) => (
                          <img
                            key={i}
                            src={img}
                            alt={`Report image ${i + 1}`}
                            className="w-full h-32 object-cover rounded-lg border border-gray-200 hover:scale-105 transition-transform cursor-pointer"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {report.signature && (
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Customer Signature:</h3>
                      <div className="inline-block p-4 bg-white border border-gray-200 rounded-lg">
                        <img
                          src={report.signature}
                          alt="Customer Signature"
                          className="w-64 h-16 object-contain"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}