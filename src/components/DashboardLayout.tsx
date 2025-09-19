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
import { AnimatePresence, motion } from 'framer-motion';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [showProfilePopup, setShowProfilePopup] = useState(false);

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
        label: "Users",
        href: "/admin/users",
        icon: <IconUsers className="h-7 w-7 shrink-0" />,
      },
      {
        label: "Job Types",
        href: "/admin/job-types",
        icon: <IconClipboardList className="h-7 w-7 shrink-0" />,
      },
      {
        label: "Tracking",
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
        label: "Tracking",
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

  const handleSignOut = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowProfilePopup(false);
    signOut({ callbackUrl: '/auth/signin' });
  };

  const navigationLinks = getNavigationLinks();

  return (
    <div className="rounded-md flex flex-col md:flex-row bg-gray-100 dark:bg-neutral-800 w-full flex-1 mx-auto overflow-y-auto h-screen">
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody 
          className="justify-between gap-10"
          navigationLinks={navigationLinks}
        >
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            <div className="mt-8 flex flex-col gap-2">
              {navigationLinks.map((link, idx) => (
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
        <div className="p-2 md:p-10 bg-white flex flex-col gap-2 flex-1 w-full h-full overflow-auto">
          {children}
        </div>
      </div>

      {/* Account Sign Out Button - Bottom Right Corner (Mobile Only) */}
      <div className="fixed bottom-6 right-6 z-50 md:hidden">
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => setShowProfilePopup(!showProfilePopup)}
          className="bg-white/90 backdrop-blur-md rounded-full p-3 shadow-xl border border-gray-200/50 hover:bg-white transition-colors"
        >
          <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white text-lg font-bold">
              {session.user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </div>
        </motion.button>

        {/* Sign Out Confirmation Popup */}
        <AnimatePresence>
          {showProfilePopup && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/30 -z-10"
                onClick={() => setShowProfilePopup(false)}
              />
              
              {/* Popup */}
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute bottom-full right-0 mb-3 bg-white rounded-xl shadow-lg border border-gray-200 p-2 min-w-[160px]"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSignOut(e);
                  }}
                  className="w-full flex items-center justify-center space-x-2 p-3 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                >
                  <IconLogout className="w-4 h-4 text-red-600" />
                  <span className="text-red-700 font-medium text-sm">Sign Out</span>
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}