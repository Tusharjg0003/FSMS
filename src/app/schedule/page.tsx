'use client';

import { useEffect, useMemo, useState } from 'react';
import { addDays, startOfWeek, format, setHours, setMinutes } from 'date-fns';
import { useSession } from 'next-auth/react';

type Job = {
  id: number;
  status: string;
  startTime: string;
  endTime?: string | null;
  location: string;
  jobType: { id: number; name: string };
  technician?: { id: number; name: string; email: string };
};

const HOURS = Array.from({ length: 11 }).map((_, i) => 8 + i); // 08:00..18:00

export default function SchedulePage() {
  const { data: session } = useSession();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [weekStart, setWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 })); // Mon
  const [techFilter, setTechFilter] = useState<string>('');

  const weekDays = useMemo(() => Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i)), [weekStart]);

  useEffect(() => {
    const from = weekDays[0].toISOString();
    const to = addDays(weekDays[6], 1).toISOString(); // end of week
    const url = new URL('/api/jobs', window.location.origin);
    url.searchParams.set('from', from);
    url.searchParams.set('to', to);
    if (techFilter) url.searchParams.set('technicianId', techFilter);
    fetch(url.toString()).then(res => res.json()).then(setJobs);
  }, [weekDays, techFilter]);

  function moveWeek(delta: number) {
    setWeekStart(addDays(weekStart, 7 * delta));
  }

  function jobStyle(job: Job, day: Date) {
    const start = new Date(job.startTime);
    const end = job.endTime ? new Date(job.endTime) : new Date(start.getTime() + 60 * 60 * 1000);
    if (format(start, 'yyyy-MM-dd') !== format(day, 'yyyy-MM-dd')) return { display: 'none' };
    const topHour = 8;
    const minutesFromTop = (start.getHours() - topHour) * 60 + start.getMinutes();
    const duration = (end.getTime() - start.getTime()) / 60000;
    return {
      position: 'absolute' as const,
      top: `${(minutesFromTop / (60 * (HOURS.length))) * 100}%`,
      height: `${(duration / (60 * (HOURS.length))) * 100}%`,
      left: '4px',
      right: '4px',
      background: '#60a5fa',
      color: 'white',
      borderRadius: '0.5rem',
      padding: '4px 6px',
      overflow: 'hidden',
      fontSize: '12px',
    };
  }

  return (
    <div className="max-w-7xl mx-auto py-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Weekly Schedule</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => moveWeek(-1)} className="px-3 py-1 border rounded">← Prev</button>
          <div className="px-2">{format(weekDays[0], 'd MMM')} – {format(weekDays[6], 'd MMM yyyy')}</div>
          <button onClick={() => moveWeek(1)} className="px-3 py-1 border rounded">Next →</button>
        </div>
      </div>

      {/* Optional technician filter for admins */}
      {(session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPERVISOR') && (
        <div className="mb-4">
          <input
            type="number"
            placeholder="Filter by Technician ID (optional)"
            className="border rounded px-3 py-2"
            value={techFilter}
            onChange={(e) => setTechFilter(e.target.value)}
          />
        </div>
      )}

      <div className="grid grid-cols-8 gap-2">
        <div className="col-span-1">
          {/* hour labels */}
          <div className="h-10"></div>
          {HOURS.map((h) => (
            <div key={h} className="h-16 text-xs text-gray-500">{format(setMinutes(setHours(new Date(), h), 0), 'HH:mm')}</div>
          ))}
        </div>

        {weekDays.map((day) => (
          <div key={day.toISOString()} className="col-span-1">
            <div className="h-10 text-center font-semibold">{format(day, 'EEE d')}</div>
            <div className="relative border rounded h-[704px] bg-white">
              {/* grid lines */}
              {HOURS.map((h) => (
                <div key={h} className="absolute left-0 right-0 border-t border-gray-100" style={{ top: `${((h - 8) / HOURS.length) * 100}%` }} />
              ))}
              {/* jobs on this day */}
              {jobs.map((job) => (
                <div key={job.id + String(day)} style={jobStyle(job, day)}>
                  <div className="font-semibold truncate">{job.jobType?.name}</div>
                  <div className="truncate">{job.technician?.name ?? 'Unassigned'}</div>
                  <div className="truncate">{format(new Date(job.startTime), 'HH:mm')}–{job.endTime ? format(new Date(job.endTime), 'HH:mm') : ''}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-sm text-gray-500">
        Tip: Use Technician ID filter to inspect individual availability. Empty slots indicate free time.
      </p>
    </div>
  );
}
