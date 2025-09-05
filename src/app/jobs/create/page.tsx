// 'use client';

// import { useSession } from 'next-auth/react';
// import { useRouter } from 'next/navigation';
// import { useEffect, useState } from 'react';
// import Link from 'next/link';

// interface JobType {
//   id: number;
//   name: string;
//   description?: string;
// }

// interface Technician {
//   id: number;
//   name: string;
//   email: string;
// }

// export default function CreateJobPage() {
//   const { data: session, status } = useSession();
//   const router = useRouter();
//   const [jobTypes, setJobTypes] = useState<JobType[]>([]);
//   const [technicians, setTechnicians] = useState<Technician[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState('');

//   useEffect(() => {
//     if (status === 'unauthenticated') {
//       router.push('/auth/signin');
//     } else if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
//       router.push('/dashboard');
//     }
//   }, [status, session, router]);

//   useEffect(() => {
//     if (session) {
//       fetchJobTypes();
//       fetchTechnicians();
//     }
//   }, [session]);

//   const fetchJobTypes = async () => {
//     try {
//       const response = await fetch('/api/job-types');
//       if (response.ok) {
//         const data = await response.json();
//         setJobTypes(data);
//       }
//     } catch (error) {
//       console.error('Error fetching job types:', error);
//     }
//   };

//   const fetchTechnicians = async () => {
//     try {
//       const response = await fetch('/api/users?role=TECHNICIAN');
//       if (response.ok) {
//         const data = await response.json();
//         setTechnicians(data);
//       }
//     } catch (error) {
//       console.error('Error fetching technicians:', error);
//     }
//   };

//   const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault();
//     setLoading(true);
//     setError('');

//     const formData = new FormData(e.currentTarget);
//     const jobData = {
//       jobTypeId: formData.get('jobTypeId'),
//       status: formData.get('status'),
//       startTime: formData.get('startTime'),
//       endTime: formData.get('endTime') || null,
//       location: formData.get('location'),
//       technicianId: formData.get('technicianId') || null,
//     };

//     try {
//       const response = await fetch('/api/jobs', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify(jobData),
//       });

//       if (response.ok) {
//         router.push('/jobs?message=Job created successfully');
//       } else {
//         const errorData = await response.json();
//         setError(errorData.error || 'Failed to create job');
//       }
//     } catch (error) {
//       setError('An error occurred while creating the job');
//     } finally {
//       setLoading(false);
//     }
//   };

//   if (status === 'loading') {
//     return (
//       <div className="min-h-screen flex items-center justify-center">
//         <div className="text-lg">Loading...</div>
//       </div>
//     );
//   }

//   if (!session || session.user?.role !== 'ADMIN') {
//     return null;
//   }

//   return (
//     <div className="min-h-screen bg-gray-50">
//       <div className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
//         <div className="px-4 py-6 sm:px-0">
//           <div className="mb-6">
//             <Link
//               href="/jobs"
//               className="text-blue-600 hover:text-blue-900 text-sm font-medium"
//             >
//               ← Back to Jobs
//             </Link>
//             <h1 className="mt-2 text-3xl font-bold text-gray-900">Create New Job</h1>
//             <p className="mt-1 text-sm text-gray-600">
//               Create a new field service job and assign it to a technician
//             </p>
//           </div>

//           <div className="bg-white shadow sm:rounded-lg">
//             <form onSubmit={handleSubmit} className="space-y-6 p-6">
//               {error && (
//                 <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
//                   {error}
//                 </div>
//               )}

//               <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
//                 <div>
//                   <label htmlFor="jobTypeId" className="block text-sm font-medium text-gray-700">
//                     Job Type *
//                   </label>
//                   <select
//                     id="jobTypeId"
//                     name="jobTypeId"
//                     required
//                     className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
//                   >
//                     <option value="">Select a job type</option>
//                     {jobTypes.map((type) => (
//                       <option key={type.id} value={type.id}>
//                         {type.name}
//                       </option>
//                     ))}
//                   </select>
//                 </div>

//                 <div>
//                   <label htmlFor="status" className="block text-sm font-medium text-gray-700">
//                     Status *
//                   </label>
//                   <select
//                     id="status"
//                     name="status"
//                     required
//                     className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
//                   >
//                     <option value="pending">Pending</option>
//                     <option value="in progress">In Progress</option>
//                     <option value="completed">Completed</option>
//                     <option value="cancelled">Cancelled</option>
//                   </select>
//                 </div>

//                 <div>
//                   <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">
//                     Start Time *
//                   </label>
//                   <input
//                     type="datetime-local"
//                     id="startTime"
//                     name="startTime"
//                     required
//                     className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
//                   />
//                 </div>

//                 <div>
//                   <label htmlFor="endTime" className="block text-sm font-medium text-gray-700">
//                     End Time
//                   </label>
//                   <input
//                     type="datetime-local"
//                     id="endTime"
//                     name="endTime"
//                     className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
//                   />
//                 </div>

//                 <div className="sm:col-span-2">
//                   <label htmlFor="location" className="block text-sm font-medium text-gray-700">
//                     Location *
//                   </label>
//                   <input
//                     type="text"
//                     id="location"
//                     name="location"
//                     required
//                     className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
//                     placeholder="Enter job location"
//                   />
//                 </div>

//                 <div className="sm:col-span-2">
//                   <label htmlFor="technicianId" className="block text-sm font-medium text-gray-700">
//                     Assign to Technician
//                   </label>
//                   <select
//                     id="technicianId"
//                     name="technicianId"
//                     className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
//                   >
//                     <option value="">Unassigned</option>
//                     {technicians.map((technician) => (
//                       <option key={technician.id} value={technician.id}>
//                         {technician.name} ({technician.email})
//                       </option>
//                     ))}
//                   </select>
//                 </div>
//               </div>

//               <div className="flex justify-end space-x-3">
//                 <Link
//                   href="/jobs"
//                   className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
//                 >
//                   Cancel
//                 </Link>
//                 <button
//                   type="submit"
//                   disabled={loading}
//                   className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
//                 >
//                   {loading ? 'Creating...' : 'Create Job'}
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// } 






'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';

interface JobType {
  id: number;
  name: string;
  description?: string;
}

interface Technician {
  id: number;
  name: string;
  email: string;
}

// helper: format current local time to 'YYYY-MM-DDTHH:mm' for <input type="datetime-local">
function formatLocalForDatetimeLocal(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

export default function CreateJobPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [jobTypes, setJobTypes] = useState<JobType[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedTechnicians, setSelectedTechnicians] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    clientName: '',
    companyName: '',
    phoneNumber: '',
    jobTypeId: '',
    jobSource: '',
    toolsRequired: '',
    location: '',
    startTime: '',
    endTime: '',
    status: 'pending'
  });

  // NEW: auto-assign toggle + conflict list
  const [autoAssign, setAutoAssign] = useState(false);
  const [conflicts, setConflicts] = useState<any[]>([]);

  // Default date-times (computed once)
  const defaults = useMemo(() => {
    const now = new Date();
    const plus1h = new Date(now.getTime() + 60 * 60 * 1000);
    return {
      start: formatLocalForDatetimeLocal(now),
      end: formatLocalForDatetimeLocal(plus1h),
    };
  }, []);

  // Auth gating
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (
      status === 'authenticated' &&
      (session?.user as any)?.role !== 'ADMIN'
    ) {
      router.push('/dashboard');
    }
  }, [status, session, router]);

  // Bootstrap data
  useEffect(() => {
    if (status === 'authenticated') {
      fetchJobTypes();
      fetchTechnicians();
    }
  }, [status]);

  const fetchJobTypes = async () => {
    try {
      const response = await fetch('/api/job-types');
      if (response.ok) setJobTypes(await response.json());
    } catch (err) {
      console.error('Error fetching job types:', err);
    }
  };

  const fetchTechnicians = async () => {
    try {
      const response = await fetch('/api/users?role=TECHNICIAN');
      if (response.ok) setTechnicians(await response.json());
    } catch (err) {
      console.error('Error fetching technicians:', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleTechnician = (technicianId: number) => {
    setSelectedTechnicians(prev => 
      prev.includes(technicianId) 
        ? prev.filter(id => id !== technicianId)
        : [...prev, technicianId]
    );
  };

  const resetForm = () => {
    setFormData({
      clientName: '',
      companyName: '',
      phoneNumber: '',
      jobTypeId: '',
      jobSource: '',
      toolsRequired: '',
      location: '',
      startTime: '',
      endTime: '',
      status: 'pending'
    });
    setSelectedTechnicians([]);
    setError('');
    setConflicts([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setConflicts([]);

    const jobData = {
      jobTypeId: formData.jobTypeId,
      status: formData.status,
      startTime: formData.startTime,
      endTime: formData.endTime || null,
      location: formData.location,
      technicianId: selectedTechnicians.length > 0 ? selectedTechnicians[0] : null, // Taking first selected technician for now
      // Additional fields can be stored in a metadata JSON field if your schema supports it
      clientName: formData.clientName,
      companyName: formData.companyName,
      phoneNumber: formData.phoneNumber,
      jobSource: formData.jobSource,
      toolsRequired: formData.toolsRequired
    };

    try {
      const response = await fetch(`/api/jobs${autoAssign ? '?autoAssign=true' : ''}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jobData),
      });

      if (response.status === 409) {
        const data = await response.json();
        setError(data.error || 'Scheduling conflict');
        setConflicts(data.conflicts || []);
        setLoading(false);
        return;
      }

      if (response.ok) {
        router.push('/jobs?message=Job created successfully');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create job');
      }
    } catch (err) {
      setError('An error occurred while creating the job');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/jobs"
              className="text-blue-600 hover:text-blue-900 text-sm font-medium mb-4 inline-block"
            >
              ← Back to Jobs
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Job</h1>
            <p className="text-gray-600">Fill out the form below to create a new field service job</p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
              {conflicts.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
                  <div className="font-semibold mb-2">Conflicting assignments:</div>
                  <ul className="list-disc ml-5 space-y-1">
                    {conflicts.map((c) => (
                      <li key={c.id}>
                        #{c.id} • {c.jobType ?? ''} • {new Date(c.startTime).toLocaleString()} —{' '}
                        {c.endTime ? new Date(c.endTime).toLocaleString() : 'N/A'} • {c.status}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Job Info */}
            <div className="bg-blue-50 p-8 rounded-2xl shadow-lg border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">Job Details</h2>
              
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Job Type *
                  </label>
                  <select
                    name="jobTypeId"
                    value={formData.jobTypeId}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 bg-blue-100 border-2 border-blue-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors text-gray-700"
                  >
                    <option value="">Select a job type</option>
                    {jobTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Status *
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 bg-blue-100 border-2 border-blue-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors text-gray-700"
                  >
                    <option value="pending">Pending</option>
                    <option value="in progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Location *
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 bg-blue-100 border-2 border-blue-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors text-gray-700"
                    placeholder="Enter full address"
                  />
                </div>
              </div>
            </div>

            {/* Schedule Section */}
            <div className="bg-blue-50 p-8 rounded-2xl border border-blue-100">
              <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">Schedule</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    From *
                  </label>
                  <input
                    type="datetime-local"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 bg-blue-100 border-2 border-blue-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors text-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    To
                  </label>
                  <input
                    type="datetime-local"
                    name="endTime"
                    value={formData.endTime}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-blue-100 border-2 border-blue-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors text-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Assign Technicians
                  </label>
                  {/* <div className="space-y-3 max-h-48 overflow-y-auto">
                    {technicians.map((technician) => (
                      <div key={technician.id} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`tech-${technician.id}`}
                          checked={selectedTechnicians.includes(technician.id)}
                          onChange={() => toggleTechnician(technician.id)}
                          className="w-4 h-4 text-blue-600 bg-blue-100 border-blue-300 rounded focus:ring-blue-500"
                        />
                        <label
                          htmlFor={`tech-${technician.id}`}
                          className="ml-3 text-sm font-medium text-gray-700 cursor-pointer"
                        >
                          {technician.name} ({technician.email})
                        </label>
                      </div>
                    ))}
                  </div> */}
                  <select
                    name="assignTechnician"
                    value={selectedTechnicians[0] || ''} // single selection
                    onChange={(e) => setSelectedTechnicians([Number(e.target.value)])}
                    required
                    className="w-full px-4 py-3 bg-blue-100 border-2 border-blue-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors text-gray-700"
                  >
                    <option value="">Select a technician</option>
                    {technicians.map((technician) => (
                      <option key={technician.id} value={technician.id}>
                        {technician.name} ({technician.email})
                      </option>
                    ))}
                  </select>

                </div>
                
                {/* New-auto assign toggle */}
                <div className="flex items-center gap-2">
                  <input
                    id="autoAssign"
                    type="checkbox"
                    checked={autoAssign}
                    onChange={(e) => setAutoAssign(e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                  <label htmlFor="autoAssign" className="text-sm text-gray-700">
                    Auto-assign available technician
                  </label>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center space-x-6">
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-8 py-3 rounded-xl font-semibold text-lg transition-colors min-w-32"
              >
                {loading ? 'Creating...' : 'Create Job'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-500 hover:bg-gray-600 text-white px-8 py-3 rounded-xl font-semibold text-lg transition-colors min-w-32"
              >
                Reset
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}