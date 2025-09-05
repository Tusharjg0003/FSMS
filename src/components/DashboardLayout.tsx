'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Sidebar, SidebarBody, SidebarLink } from '@/components/ui/sidebar';
import {
  IconHome,
  IconBriefcase,
  IconUsers,
  IconClipboardList,
  IconMapPin,
  IconChartBar,
  IconUserCircle,
  IconLogout
} from '@tabler/icons-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session || !session.user || !('role' in session.user)) {
    return null;
  }

  const getNavigationLinks = () => {
    const userRole = (session.user as any).role;
    
    const baseLinks = [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: <IconHome className="h-7 w-7 shrink-0" />,
      },
      {
        label: "Jobs",
        href: "/jobs",
        icon: <IconBriefcase className="h-7 w-7 shrink-0" />,
      }
    ];

    const adminLinks = [
      {
        label: "User Management",
        href: "/admin/users",
        icon: <IconUsers className="h-7 w-7 shrink-0" />,
      },
      {
        label: "Job Types",
        href: "/admin/job-types",
        icon: <IconClipboardList className="h-7 w-7 shrink-0" />,
      },
      {
        label: "Location Tracking",
        href: "/admin/technician-locations",
        icon: <IconMapPin className="h-7 w-7 shrink-0" />,
      },
      {
        label: "Analytics",
        href: "/admin/analytics",
        icon: <IconChartBar className="h-7 w-7 shrink-0" />,
      }
    ];

    const supervisorLinks = [
      {
        label: "Location Tracking",
        href: "/admin/technician-locations",
        icon: <IconMapPin className="h-7 w-7 shrink-0" />,
      }
    ];

    let links = [...baseLinks];

    if (userRole === 'ADMIN') {
      links = [...links, ...adminLinks];
    } else if (userRole === 'SUPERVISOR') {
      links = [...links, ...supervisorLinks];
    }

    return links;
  };

  return (
    <div className="rounded-md flex flex-col md:flex-row bg-gray-100 dark:bg-neutral-800 w-full flex-1 mx-auto overflow-y-auto h-screen">
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-10">
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            <div className="mt-8 flex flex-col gap-2">
              {getNavigationLinks().map((link, idx) => (
                <SidebarLink key={idx} link={link} />
              ))}
            </div>
          </div>
          <div>
            <SidebarLink
              link={{
                label: session.user?.name || "User",
                href: "/profile",
                icon: <IconUserCircle className="h-7 w-7 shrink-0" />,
              }}
            />
            <div 
              onClick={() => signOut({ callbackUrl: '/auth/signin' })}
              className="flex items-center justify-start gap-2 group/sidebar py-2 px-2 rounded-md hover:bg-[#517BBF] hover:bg-opacity-40 transition-colors cursor-pointer text-black group-hover/sidebar:text-white"
            >
              <IconLogout className="h-7 w-7 shrink-0" />
              <span className="text-sm group-hover/sidebar:translate-x-1 transition duration-150 whitespace-pre inline-block !p-0 !m-0">
                Sign Out
              </span>
            </div>
          </div>
        </SidebarBody>
      </Sidebar>
      
      {/* Main content area */}
      <div className="flex flex-1">
        <div className="p-2 md:p-10 bg-white flex flex-col gap-2 flex-1 w-full h-full overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
}