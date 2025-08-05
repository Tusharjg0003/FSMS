'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bar, Pie, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement);

type Job = {
  id: number;
  status: string;
  startTime: string;
  endTime?: string;
  location: string;
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
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session || !session.user || !('role' in session.user)) {
    return null;
  }

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
        {/* Filter Bar */}
        <div className="flex space-x-2 mb-4">
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
        {/* Jobs Table */}
        {loading ? (
          <div className="py-8 text-center">Loading jobs...</div>
        ) : !jobs.length ? (
          <div className="py-8 text-center text-gray-500">No jobs found.</div>
        ) : (
          <div className="overflow-x-auto max-h-96 overflow-y-scroll bg-white shadow rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Technician</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {jobs.map((job) => (
                  <tr key={job.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{job.jobType?.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{job.status}</td>
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

  const TechnicianOfTheMonth = () => {
    const [techOfMonth, setTechOfMonth] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      fetch('/api/admin/analytics')
        .then((res) => res.json())
        .then((data) => {
          console.log('Analytics data:', data);
          console.log('Technician of the month:', data.technicianOfTheMonth);
          setTechOfMonth(data.technicianOfTheMonth);
          setLoading(false);
        })
        .catch((error) => {
          console.error('Error fetching analytics:', error);
          setLoading(false);
        });
    }, []);

    if (loading) return <div className="py-4 text-center">Loading technician of the month...</div>;
    if (!techOfMonth) return <div className="py-4 text-center text-gray-500">No technician of the month data available</div>;

    return (
      <div className="mb-8 p-6 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg shadow">
        <div className="flex items-center space-x-6">
          <div className="text-4xl">🏆</div>
          {techOfMonth.profilePicture ? (
            <img
              src={techOfMonth.profilePicture}
              alt={techOfMonth.name}
              className="w-16 h-16 rounded-full object-cover border-4 border-yellow-200 shadow"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-2xl text-gray-500 border-4 border-yellow-200 shadow">
              {techOfMonth.name.charAt(0)}
            </div>
          )}
          <div>
            <div className="text-lg font-semibold text-yellow-900">Technician of the Month (Last 30 Days)</div>
            <div className="text-xl font-bold text-yellow-700">{techOfMonth.name}</div>
            <div className="text-gray-700">{techOfMonth.email}</div>
            {techOfMonth.nationality && (
              <div className="text-gray-600">Nationality: {techOfMonth.nationality}</div>
            )}
            {techOfMonth.dateOfBirth && (
              <div className="text-gray-600">Date of Birth: {new Date(techOfMonth.dateOfBirth).toLocaleDateString()}</div>
            )}
            <div className="mt-1 text-yellow-800 font-medium">Completed Jobs: {techOfMonth.completedJobs}</div>
          </div>
        </div>
      </div>
    );
  };

  const Analytics = () => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      fetch('/api/admin/analytics')
        .then((res) => res.json())
        .then((d) => {
          setData(d);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }, []);

    if (loading) return <div className="py-8 text-center">Loading analytics...</div>;
    if (!data) return <div className="py-8 text-center">Failed to load analytics.</div>;

    // Prepare chart data
    const statusLabels = data.jobsByStatus.map((s: any) => s.status);
    const statusCounts = data.jobsByStatus.map((s: any) => s._count._all);

    const techLabels = data.jobsPerTechnician.map((t: any) => t.technician.name);
    const techCounts = data.jobsPerTechnician.map((t: any) => t.count);

    const typeLabels = data.jobsPerJobType.map((t: any) => t.jobType.name);
    const typeCounts = data.jobsPerJobType.map((t: any) => t.count);

    const monthLabels = data.jobsCompletedPerMonth.map((m: any) => m.month);
    const monthCounts = data.jobsCompletedPerMonth.map((m: any) => m.count);

    return (
      <div className="mt-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Analytics Dashboard</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow flex flex-col items-center">
            <div className="text-2xl font-bold text-blue-600">{data.totalJobs}</div>
            <div className="text-gray-700 mt-2">Total Jobs</div>
          </div>
          {data.jobsByStatus.map((s: any) => (
            <div key={s.status} className="bg-white p-6 rounded-lg shadow flex flex-col items-center">
              <div className="text-2xl font-bold text-green-600">{s._count._all}</div>
              <div className="text-gray-700 mt-2 capitalize">{s.status} Jobs</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Jobs by Status</h3>
            <Pie
              data={{
                labels: statusLabels,
                datasets: [
                  {
                    data: statusCounts,
                    backgroundColor: ['#60a5fa', '#fbbf24', '#34d399', '#f87171'],
                  },
                ],
              }}
            />
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Jobs per Technician</h3>
            <Bar
              data={{
                labels: techLabels,
                datasets: [
                  {
                    label: 'Jobs',
                    data: techCounts,
                    backgroundColor: '#60a5fa',
                  },
                ],
              }}
              options={{
                plugins: { legend: { display: false } },
                responsive: true,
                scales: { x: { ticks: { autoSkip: false } } },
              }}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Jobs per Job Type</h3>
            <Bar
              data={{
                labels: typeLabels,
                datasets: [
                  {
                    label: 'Jobs',
                    data: typeCounts,
                    backgroundColor: '#34d399',
                  },
                ],
              }}
              options={{
                plugins: { legend: { display: false } },
                responsive: true,
                scales: { x: { ticks: { autoSkip: false } } },
              }}
            />
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Jobs Completed Per Month</h3>
            <Line
              data={{
                labels: monthLabels,
                datasets: [
                  {
                    label: 'Completed Jobs',
                    data: monthCounts,
                    borderColor: '#6366f1',
                    backgroundColor: '#a5b4fc',
                    fill: true,
                  },
                ],
              }}
              options={{
                responsive: true,
                plugins: { legend: { display: false } },
              }}
            />
          </div>
        </div>
      </div>
    );
  };

  const getRoleBasedContent = () => {
    switch ((session.user as any).role) {
      case 'ADMIN':
        return (
          <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-100">
            <div className="max-w-7xl mx-auto py-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome back, {session.user?.name}!</h2>
              <p className="text-gray-600 mb-6">You are logged in as a admin.</p>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Jobs Overview</h3>
                <Link
                  href="/jobs/create"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Create New Job
                </Link>
              </div>
              <JobsList />
              <TechnicianOfTheMonth />
              <Analytics />
            </div>
          </div>
        );
      case 'SUPERVISOR':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link href="/jobs" className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold mb-4 text-blue-600">Job Management</h3>
              <p className="text-gray-600">Create and assign jobs to technicians</p>
            </Link>
            <Link href="/jobs/create" className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold mb-4 text-green-600">Create New Job</h3>
              <p className="text-gray-600">Create a new field service job</p>
            </Link>
          </div>
        );
      case 'TECHNICIAN':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link href="/jobs" className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold mb-4 text-blue-600">My Jobs</h3>
              <p className="text-gray-600">View and update assigned jobs</p>
            </Link>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">Reports</h3>
              <p className="text-gray-600">Submit job completion reports</p>
            </div>
          </div>
        );
      default:
        return <div>Welcome to the dashboard!</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-semibold text-gray-900">FSM Dashboard</h1>
              {(session.user as any).role === 'ADMIN' && (
                <>
                  <Link href="/admin/users" className="text-gray-700 hover:text-blue-600 font-medium">User Management</Link>
                  <Link href="/admin/job-types" className="text-gray-700 hover:text-blue-600 font-medium">Job Types</Link>
                </>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Welcome, {session.user?.name} ({(session.user as any).role})
              </span>
              <button
                onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {getRoleBasedContent()}
        </div>
      </main>
    </div>
  );
} 