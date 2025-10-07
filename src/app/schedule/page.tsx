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
  // Customer/Company Information
  customerName?: string;
  clientName?: string; // Keep for backward compatibility
  companyName?: string;
  phoneNumber?: string;
  email?: string;
};

type Technician = {
  id: number;
  name: string;
  email: string;
};

// Changed to 24 hours (0-23)
const HOURS = Array.from({ length: 24 }).map((_, i) => i); // 00:00..23:00

export default function SchedulePage() {
  const { data: session } = useSession();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [weekStart, setWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 })); // Mon
  const [selectedTechnicians, setSelectedTechnicians] = useState<number[]>([]);

  const weekDays = useMemo(() => Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i)), [weekStart]);

  // Fetch technicians
  useEffect(() => {
    if (session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPERVISOR') {
      fetch('/api/users?role=TECHNICIAN')
        .then(res => res.json())
        .then(setTechnicians)
        .catch(err => console.error('Error fetching technicians:', err));
    }
  }, [session]);

  useEffect(() => {
    const from = weekDays[0].toISOString();
    const to = addDays(weekDays[6], 1).toISOString(); // end of week
    const url = new URL('/api/jobs', window.location.origin);
    url.searchParams.set('from', from);
    url.searchParams.set('to', to);
    // Use the first selected technician for filtering
    if (selectedTechnicians.length > 0) {
      url.searchParams.set('technicianId', selectedTechnicians[0].toString());
    }
    fetch(url.toString()).then(res => res.json()).then(setJobs);
  }, [weekDays, selectedTechnicians]);

  function moveWeek(delta: number) {
    setWeekStart(addDays(weekStart, 7 * delta));
  }

  // Create separate job segments for multi-day jobs
  function createJobSegments() {
    // Show all jobs including pending ones - they are scheduled jobs too!
    const activeJobs = jobs.filter(job => {
      const status = job.status.toLowerCase();
      // Show all jobs except cancelled ones
      return status !== 'cancelled';
    });

    const segments: Array<Job & { segmentDay: Date; segmentStart: Date; segmentEnd: Date; isStart: boolean; isEnd: boolean; isContinuation: boolean }> = [];
    
    activeJobs.forEach(job => {
      const start = new Date(job.startTime);
      const end = job.endTime ? new Date(job.endTime) : new Date(start.getTime() + 60 * 60 * 1000);
      
      // Get all days this job spans
      const jobStartDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const jobEndDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      
      // Create a segment for each day the job spans
      const currentDay = new Date(jobStartDay);
      while (currentDay <= jobEndDay) {
        // Only include days that are in our current week view
        const isInWeek = weekDays.some(weekDay => 
          format(weekDay, 'yyyy-MM-dd') === format(currentDay, 'yyyy-MM-dd')
        );
        
        if (isInWeek) {
          const isStartDay = format(currentDay, 'yyyy-MM-dd') === format(start, 'yyyy-MM-dd');
          const isEndDay = format(currentDay, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd');
          const isSingleDay = isStartDay && isEndDay;
          
          // Calculate segment start and end times for this specific day
          let segmentStart: Date;
          let segmentEnd: Date;
          
          if (isSingleDay) {
            segmentStart = start;
            segmentEnd = end;
          } else if (isStartDay) {
            segmentStart = start;
            segmentEnd = new Date(currentDay.getFullYear(), currentDay.getMonth(), currentDay.getDate(), 23, 59, 59);
          } else if (isEndDay) {
            segmentStart = new Date(currentDay.getFullYear(), currentDay.getMonth(), currentDay.getDate(), 0, 0, 0);
            segmentEnd = end;
          } else {
            segmentStart = new Date(currentDay.getFullYear(), currentDay.getMonth(), currentDay.getDate(), 0, 0, 0);
            segmentEnd = new Date(currentDay.getFullYear(), currentDay.getMonth(), currentDay.getDate(), 23, 59, 59);
          }
          
          segments.push({
            ...job,
            segmentDay: new Date(currentDay),
            segmentStart,
            segmentEnd,
            isStart: isStartDay,
            isEnd: isEndDay,
            isContinuation: !isStartDay && !isEndDay
          });
        }
        
        currentDay.setDate(currentDay.getDate() + 1);
      }
    });
    
    return segments;
  }

  function jobSegmentStyle(segment: any) {
    const minutesFromTop = segment.segmentStart.getHours() * 60 + segment.segmentStart.getMinutes();
    const duration = (segment.segmentEnd.getTime() - segment.segmentStart.getTime()) / 60000;
    
    return {
      position: 'absolute' as const,
      top: `${(minutesFromTop / (60 * HOURS.length)) * 100}%`,
      height: `${Math.max((duration / (60 * HOURS.length)) * 100, 1)}%`, // Minimum 1% height
      left: '4px',
      right: '4px',
      background: segment.isContinuation ? '#8b5cf6' : '#60a5fa', // Purple for continuation, blue for start/end
      color: 'white',
      borderRadius: '0.5rem',
      padding: '4px 6px',
      overflow: 'hidden',
      fontSize: '12px',
      // Add visual indicators
      borderLeft: segment.isStart ? '3px solid white' : 'none',
      borderRight: segment.isEnd ? '3px solid white' : 'none',
      opacity: segment.isContinuation ? 0.8 : 1.0,
    };
  }

  const jobSegments = createJobSegments();

  return (
    <div className="max-w-7xl mx-auto py-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Weekly Schedule (24 Hours)</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => moveWeek(-1)} className="px-3 py-1 border rounded">← Prev</button>
          <div className="px-2">{format(weekDays[0], 'd MMM')} – {format(weekDays[6], 'd MMM yyyy')}</div>
          <button onClick={() => moveWeek(1)} className="px-3 py-1 border rounded">Next →</button>
        </div>
      </div>

      {/* Technician filter section for admins */}
      {(session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPERVISOR') && (
        <div className=" p-6 rounded-2xl shadow-lg mb-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3 text-white">
              Select Technician
            </label>
            <select
              name="assignTechnician"
              value={selectedTechnicians[0] || ''} // single selection
              onChange={(e) => setSelectedTechnicians(e.target.value ? [Number(e.target.value)] : [])}
              className="w-full px-4 py-3 bg-blue-100 border-2 border-blue-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors text-gray-700"
            >
              <option value="">All technicians</option>
              {technicians.map((technician) => (
                <option key={technician.id} value={technician.id}>
                  {technician.name} ({technician.email})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="grid grid-cols-8 gap-2">
        <div className="col-span-1">
          {/* hour labels */}
          <div className="h-10"></div>
          {HOURS.map((h) => (
            <div key={h} className="h-16 text-xs text-white">
              {format(setMinutes(setHours(new Date(), h), 0), 'HH:mm')}
            </div>
          ))}
        </div>

        {weekDays.map((day) => (
          <div key={day.toISOString()} className="col-span-1">
            <div className="h-10 text-center font-semibold">{format(day, 'EEE d')}</div>
            {/* Increased height to accommodate 24 hours with original spacing: 24 hours * 64px = 1536px */}
            <div className="relative border rounded h-[1536px] bg-white overflow-y-auto">
              {/* grid lines - now showing all 24 hours */}
              {HOURS.map((h) => (
                <div 
                  key={h} 
                  className="absolute left-0 right-0 border-t border-gray-100" 
                  style={{ top: `${(h / HOURS.length) * 100}%` }} 
                />
              ))}
              {/* job segments for this day */}
              {jobSegments
                .filter(segment => format(segment.segmentDay, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd'))
                .map((segment, index) => {
                  // Determine display text
                  let jobTitle = segment.jobType?.name;
                  let timeText = '';
                  
                  if (segment.isStart && segment.isEnd) {
                    // Single day job
                    timeText = `${format(segment.segmentStart, 'HH:mm')}–${format(segment.segmentEnd, 'HH:mm')}`;
                  } else if (segment.isStart) {
                    jobTitle += ' (Start)';
                    timeText = `${format(segment.segmentStart, 'HH:mm')}–23:59`;
                  } else if (segment.isEnd) {
                    jobTitle += ' (End)';
                    timeText = `00:00–${format(segment.segmentEnd, 'HH:mm')}`;
                  } else {
                    jobTitle += ' (Cont.)';
                    timeText = '00:00–23:59';
                  }
                  
                  return (
                    <div key={`${segment.id}-${format(day, 'yyyy-MM-dd')}-${index}`} style={jobSegmentStyle(segment)}>
                      <div className="font-semibold truncate">{jobTitle}</div>
                      <div className="truncate">{segment.technician?.name ?? 'Unassigned'}</div>
                      <div className="truncate text-xs">{timeText}</div>
                      {/* Customer Information */}
                      {(segment.customerName || segment.clientName) && (
                        <div className="truncate text-xs opacity-90">
                          👤 {segment.customerName || segment.clientName}
                        </div>
                      )}
                      {segment.phoneNumber && (
                        <div className="truncate text-xs opacity-75">
                          📞 {segment.phoneNumber}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-sm text-white">
        Tip: Use the technician filter above to inspect individual availability. Multi-day jobs show as separate blocks with (Start), (Cont.), and (End) labels.
      </p>
    </div>
  );
}