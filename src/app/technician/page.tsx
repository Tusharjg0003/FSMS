'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import TechnicianDashboardLayout from '@/components/TechnicianDashboardLayout';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Job {
  id: number;
  status: string;
  startTime: string;
  endTime?: string;
  location: string;
  jobType: { id: number; name: string };
}

export default function TechnicianDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Calendar states
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session?.user?.role !== 'TECHNICIAN') {
      router.push('/dashboard');
    }
  }, [status, session, router]);

  useEffect(() => {
    if (session?.user?.role === 'TECHNICIAN') {
      fetchJobs();
    }
  }, [session]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/jobs');
      if (res.ok) {
        const data = await res.json();
        setJobs(data);
      }
    } catch (error) {
      // handle error
    } finally {
      setLoading(false);
    }
  };

  // Calendar functions
  const getWeekDates = () => {
    const start = new Date(currentDate);
    const day = start.getDay();
    const diff = start.getDate() - day;
    const weekStart = new Date(start.setDate(diff));
    
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      return date;
    });
  };

  const getJobsForDate = (date: Date) => {
    return jobs.filter(job => {
      const jobDate = new Date(job.startTime);
      return jobDate.toDateString() === date.toDateString();
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date) => {
    return date.toDateString() === selectedDate.toDateString();
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentDate(newDate);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-500';
      case 'in progress':
        return 'bg-blue-500';
      case 'pending':
      case 'new':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (status === 'loading' || loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  if (!session || session.user?.role !== 'TECHNICIAN') {
    return null;
  }

  const weekDates = getWeekDates();
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  return (
    <TechnicianDashboardLayout>
      <div className="p-6">
        {/* Hero Section with Calendar */}
        <div className="relative bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 rounded-2xl p-8 mb-8 text-white overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-26"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-4xl font-bold mb-2">
                  Field Service Management System
                </h1>
                <p className="text-blue-100 text-lg">
                  Easily schedule jobs, assign technicians, and keep track of everything in real time.
                </p>
              </div>
              <div className="hidden lg:block">
                <div className="w-24 h-24 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/30">
                  <span className="text-3xl font-bold">FSMS</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20 mb-6">
              <h3 className="text-lg font-semibold mb-1">Welcome back, {session.user?.name}!</h3>
              <p className="text-blue-100">Dashboard</p>
            </div>

            {/* Calendar Section */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <button 
                  onClick={() => navigateWeek('prev')}
                  className="p-1 hover:bg-white/20 rounded-full transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h3 className="font-semibold">
                  {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h3>
                <button 
                  onClick={() => navigateWeek('next')}
                  className="p-1 hover:bg-white/20 rounded-full transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {weekDates.map((date, index) => {
                  const jobsForDay = getJobsForDate(date);
                  const hasJobs = jobsForDay.length > 0;
                  
                  return (
                    <div
                      key={index}
                      onClick={() => setSelectedDate(date)}
                      className={`
                        relative cursor-pointer rounded-lg p-2 md:p-3 transition-all
                        ${isSelected(date) ? 'bg-white text-blue-600 shadow-lg transform scale-105' : 
                          isToday(date) ? 'bg-blue-500/30 border-2 border-white/50' : 
                          'bg-white/5 hover:bg-white/10'}
                      `}
                    >
                      <div className="text-center">
                        <div className={`text-xs font-medium ${isSelected(date) ? 'text-blue-600' : 'text-blue-200'}`}>
                          {dayNames[index]}
                        </div>
                        <div className={`text-lg md:text-xl font-bold mt-1 ${isSelected(date) ? 'text-blue-600' : ''}`}>
                          {date.getDate()}
                        </div>
                        
                        {hasJobs && (
                          <div className="mt-2 flex flex-col gap-1">
                            {jobsForDay.slice(0, 2).map((job, jobIndex) => (
                              <div 
                                key={jobIndex}
                                className={`h-1 rounded-full ${getStatusColor(job.status)}`}
                              />
                            ))}
                            {jobsForDay.length > 2 && (
                              <div className={`text-[10px] font-semibold ${isSelected(date) ? 'text-blue-600' : 'text-white'}`}>
                                +{jobsForDay.length - 2}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Selected Date Jobs Summary */}
              <div className="mt-4 bg-white/10 rounded-lg p-3 border border-white/20">
                <h4 className="font-semibold text-sm mb-2">
                  Tasks for {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </h4>
                {getJobsForDate(selectedDate).length > 0 ? (
                  <div className="space-y-2">
                    {getJobsForDate(selectedDate).slice(0, 3).map((job, index) => (
                      <div key={index} className="flex items-center justify-between text-sm bg-white/5 rounded px-2 py-1">
                        <span className="truncate flex-1">{job.jobType.name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(job.status)} text-white ml-2`}>
                          {job.status}
                        </span>
                      </div>
                    ))}
                    {getJobsForDate(selectedDate).length > 3 && (
                      <div className="text-xs text-blue-200">
                        +{getJobsForDate(selectedDate).length - 3} more tasks
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-blue-200">No tasks scheduled</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </TechnicianDashboardLayout>
  );
}