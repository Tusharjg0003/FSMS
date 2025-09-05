
// 'use client';

// import { useSession } from 'next-auth/react';
// import { useRouter } from 'next/navigation';
// import { useEffect, useState } from 'react';
// import Link from 'next/link';

// interface Job {
//   id: number;
//   status: string;
//   startTime: string;
//   endTime?: string;
//   location: string;
//   jobType: { id: number; name: string };
// }

// export default function TechnicianJobHistoryPage() {
//   const { data: session, status } = useSession();
//   const router = useRouter();
//   const [jobs, setJobs] = useState<Job[]>([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     if (status === 'unauthenticated') {
//       router.push('/auth/signin');
//     } else if (status === 'authenticated' && session?.user?.role !== 'TECHNICIAN') {
//       router.push('/dashboard');
//     }
//   }, [status, session, router]);

//   useEffect(() => {
//     if (session?.user?.role === 'TECHNICIAN') {
//       fetchJobs();
//     }
//   }, [session]);

// const fetchJobs = async () => {
//   setLoading(true);
//   try {
//     // Use existing jobs API with completed status filter
//     const res = await fetch('/api/jobs?status=completed');
//     console.log('Response status:', res.status);
    
//     if (res.ok) {
//       const data = await res.json();
//       console.log('All completed jobs:', data);
      
//       // Filter for current technician's jobs only
//       const filtered = data.filter((job: any) => 
//         job.technician && job.technician.id == session?.user?.id
//       );
//       console.log('Filtered jobs for current technician:', filtered);
//       setJobs(filtered);
//     } else {
//       console.error('API error:', res.status, res.statusText);
//     }
//   } catch (error) {
//     console.error('Fetch error:', error);
//   } finally {
//     setLoading(false);
//   }

//   if (status === 'loading' || loading) {
//     return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
//   }
//   if (!session || session.user?.role !== 'TECHNICIAN') {
//     return null;
//   }

//   return (
//     <div className="min-h-screen bg-gray-50">
//       <div className="max-w-4xl mx-auto py-8">
//         <div className="flex justify-between items-center mb-6">
//           <h1 className="text-3xl font-bold text-gray-900">Job History</h1>
//         </div>
//         <div className="bg-white shadow rounded-lg overflow-x-auto">
//           {jobs.length === 0 ? (
//             <div className="text-center py-12">
//               <p className="text-gray-500">No completed jobs found.</p>
//             </div>
//           ) : (
//             <ul className="divide-y divide-gray-200">
//               {jobs.map((job) => (
//                 <li key={job.id}>
//                   <div className="px-4 py-4 sm:px-6 flex items-center justify-between">
//                     <div>
//                       <div className="flex items-center">
//                         <p className="text-sm font-medium text-gray-900">{job.jobType.name}</p>
//                         <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">{job.status}</span>
//                       </div>
//                       <div className="mt-1 flex items-center text-sm text-gray-500">
//                         <p>{job.location}</p>
//                         <span className="mx-2">•</span>
//                         <p>Start: {job.startTime}</p>
//                         {job.endTime && <><span className="mx-2">•</span><p>End: {job.endTime}</p></>}
//                       </div>
//                     </div>
//                     <div>
//                       <Link href={`/technician/jobs/${job.id}`} className="text-blue-600 hover:text-blue-900 text-sm font-medium">View Details</Link>
//                     </div>
//                   </div>
//                 </li>
//               ))}
//             </ul>
//           )}
//         </div>
//       </div>
//     </div>
//     );
//   } 
// }