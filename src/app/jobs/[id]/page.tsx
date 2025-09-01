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
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  if (!job) {
    return <div className="min-h-screen flex items-center justify-center">Job not found.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Job Details</h1>

      {/* Job summary */}
      <div className="bg-white shadow rounded p-6 mb-8">
        <div className="mb-2">
          <strong>Job Type:</strong> {job.jobType?.name}
        </div>
        <div className="mb-2">
          <strong>Status:</strong> {job.status}
        </div>
        <div className="mb-2">
          <strong>Location:</strong> {job.location}
        </div>
        <div className="mb-2">
          <strong>Start Time:</strong> {new Date(job.startTime).toLocaleString()}
        </div>
        <div className="mb-2">
          <strong>End Time:</strong>{' '}
          {job.endTime ? new Date(job.endTime).toLocaleString() : 'N/A'}
        </div>
        {job.technician && (
          <div className="mb-2">
            <strong>Technician:</strong> {job.technician.name}
          </div>
        )}
      </div>

      {/* Reschedule / Reassign (Admin & Supervisor only) */}
      {isManager && (
        <div className="bg-white shadow rounded p-6 mb-8">
          <h2 className="text-lg font-bold mb-4">Reschedule / Reassign</h2>

          {saveError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-3">
              {saveError}
            </div>
          )}

          {saveConflicts.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded mb-3">
              <div className="font-semibold mb-2">Conflicts:</div>
              <ul className="list-disc ml-5 space-y-1">
                {saveConflicts.map((c) => (
                  <li key={c.id}>
                    #{c.id} • {new Date(c.startTime).toLocaleString()} –{' '}
                    {c.endTime ? new Date(c.endTime).toLocaleString() : 'N/A'} • {c.status}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Start</label>
              <input
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="mt-1 w-full border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">End</label>
              <input
                type="datetime-local"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="mt-1 w-full border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Technician ID</label>
              <input
                type="number"
                value={techId}
                onChange={(e) => setTechId(e.target.value)}
                className="mt-1 w-full border-gray-300 rounded-md"
                placeholder="Leave blank to unassign"
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={save}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Submitted Reports */}
      {job.reports && job.reports.length > 0 && (
        <div className="bg-white shadow rounded p-6">
          <h2 className="text-lg font-bold mb-4">Submitted Reports</h2>
          {job.reports.map((report: any) => (
            <div
              key={report.id}
              className="mb-8 border-b pb-6 last:border-b-0 last:pb-0"
            >
              <div className="mb-2 text-sm text-gray-500">
                Submitted by {report.user?.name} ({report.user?.email}) on{' '}
                {new Date(report.submissionDate).toLocaleString()}
              </div>
              <div className="mb-2">
                <strong>Notes:</strong> {report.notes}
              </div>

              {report.images && JSON.parse(report.images).length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {JSON.parse(report.images).map((img: string, i: number) => (
                    <img
                      key={i}
                      src={img}
                      alt={`Report image ${i + 1}`}
                      className="w-20 h-20 object-cover rounded border"
                    />
                  ))}
                </div>
              )}

              {report.signature && (
                <div className="mb-2">
                  <strong>Customer Signature:</strong>
                  <div className="mt-1">
                    <img
                      src={report.signature}
                      alt="Signature"
                      className="w-40 h-12 object-contain border rounded bg-white"
                    />
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
