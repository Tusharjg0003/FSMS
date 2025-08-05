'use client';

import { useEffect, useState } from 'react';
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

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/analytics')
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  if (!data) {
    return <div className="min-h-screen flex items-center justify-center">Failed to load analytics.</div>;
  }

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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Analytics Dashboard</h1>
        {data.technicianOfTheMonth && (
          <div className="mb-8 p-6 bg-blue-50 border border-blue-200 rounded-lg flex items-center space-x-6 shadow">
            <div className="text-4xl">🏆</div>
            {data.technicianOfTheMonth.profilePicture ? (
              <img
                src={data.technicianOfTheMonth.profilePicture}
                alt={data.technicianOfTheMonth.name}
                className="w-20 h-20 rounded-full object-cover border-4 border-blue-200 shadow"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center text-3xl text-gray-500 border-4 border-blue-200 shadow">
                {data.technicianOfTheMonth.name.charAt(0)}
              </div>
            )}
            <div>
              <div className="text-lg font-semibold text-blue-900">Technician of the Month</div>
              <div className="text-xl font-bold text-blue-700">{data.technicianOfTheMonth.name}</div>
              <div className="text-gray-700">{data.technicianOfTheMonth.email}</div>
              {data.technicianOfTheMonth.nationality && (
                <div className="text-gray-600">Nationality: {data.technicianOfTheMonth.nationality}</div>
              )}
              {data.technicianOfTheMonth.dateOfBirth && (
                <div className="text-gray-600">Date of Birth: {new Date(data.technicianOfTheMonth.dateOfBirth).toLocaleDateString()}</div>
              )}
              <div className="mt-1 text-blue-800 font-medium">Completed Jobs: {data.technicianOfTheMonth.completedJobs}</div>
            </div>
          </div>
        )}
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
            <h2 className="text-lg font-semibold mb-4">Jobs by Status</h2>
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
            <h2 className="text-lg font-semibold mb-4">Jobs per Technician</h2>
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
            <h2 className="text-lg font-semibold mb-4">Jobs per Job Type</h2>
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
            <h2 className="text-lg font-semibold mb-4">Jobs Completed Per Month</h2>
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
    </div>
  );
} 