'use client';

import React, { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar, SidebarBody, SidebarLink } from '@/components/ui/sidebar';
import {
  IconHome,
  IconBriefcase,
  IconHistory,
  IconCalendar,
  IconUserCircle,
  IconLogout,
  IconBell
} from '@tabler/icons-react';

interface TechnicianDashboardLayoutProps {
  children: React.ReactNode;
}

interface Job {
  id: number;
  status: 'New' | 'In Progress' | 'Completed' | 'pending' | 'in progress' | 'completed';
  startTime: string;
  endTime?: string;
  location: string;
  jobType: { id: number; name: string };
}

const TechnicianDashboardLayout: React.FC<TechnicianDashboardLayoutProps> = ({ children }) => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [assignedJobs, setAssignedJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

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
        setAssignedJobs(data);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getJobsByStatus = (status: string) => {
    return assignedJobs.filter(job => 
      job.status.toLowerCase() === status.toLowerCase() || 
      job.status === status
    );
  };

  const isActivePath = (path: string) => {
    if (path === '/technician' || path === '/technician/dashboard') {
      return pathname === '/technician' || pathname === '/technician/dashboard';
    }
    return pathname?.startsWith(path);
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session || session.user?.role !== 'TECHNICIAN') {
    return null;
  }

  const newJobsCount = getJobsByStatus('New').length + getJobsByStatus('new').length + getJobsByStatus('pending').length;

  const navigationLinks = [
    {
      label: "Dashboard",
      href: "/technician",
      icon: <IconHome className="h-7 w-7 shrink-0" />,
    },
    {
      label: "My Jobs",
      href: "/technician/jobs", 
      icon: <IconBriefcase className="h-7 w-7 shrink-0" />,
    }
  ];

  const handleSignOut = (e: React.MouseEvent) => {
    e.preventDefault();
    signOut({ callbackUrl: '/auth/signin' });
  };

  return (
    <div className="rounded-md flex flex-col md:flex-row bg-gray-100 dark:bg-neutral-800 w-full flex-1 mx-auto overflow-y-auto h-screen">
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-10">
        <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            
            <div className="mt-8 flex flex-col gap-2">
              {navigationLinks.map((link, idx) => (
                <div key={idx} className="relative">
                  <SidebarLink 
                    link={link}
                    className={isActivePath(link.href) ? "bg-[#517BBF] bg-opacity-40 text-black" : ""}
                  />
                  {/* Job notification badge for My Jobs */}
                  {link.href === "/technician/jobs" && newJobsCount > 0 && (
                    <div className="absolute right-3 top-3 bg-red-500 text-white text-xs px-2 py-1 rounded-full min-w-[20px] h-5 flex items-center justify-center">
                      {newJobsCount}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <SidebarLink
              link={{
                label: session.user?.name || "User",
                href: "/technician/profile",
                icon: <IconUserCircle className="h-7 w-7 shrink-0" />,
              }}
            />
            <SidebarLink
              link={{
                label: "Sign Out",
                href: "#",
                icon: <IconLogout className="h-7 w-7 shrink-0" />,
              }}
              onClick={handleSignOut}
            />
          </div>
        </SidebarBody>
      </Sidebar>
      
      {/* Main content area */}
      <div className="flex flex-1">
        <div className="flex flex-col gap-2 flex-1 w-full h-full overflow-hidden">
          {/* Content Area */}
          <main className="flex-1 overflow-y-auto bg-white">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

export default TechnicianDashboardLayout;