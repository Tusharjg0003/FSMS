'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import TechnicianMap from '../../../components/TechnicianMap';
import DashboardLayout from '@/components/DashboardLayout';

export default function TechnicianLocationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && 
               session?.user?.role !== 'ADMIN' && 
               session?.user?.role !== 'SUPERVISOR') {
      router.push('/dashboard');
    }
  }, [status, session, router]);

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!session || (session.user?.role !== 'ADMIN' && session.user?.role !== 'SUPERVISOR')) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen">
        <div className="mx-auto py-8 px-4">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Technician Location Tracking</h1>
            <p className="text-gray-700 mt-2">
            Monitor real-time locations of all technicians in the field
            </p>
          </div>
        
          <TechnicianMap 
            showHistory={true}
            refreshInterval={30000} // 30 seconds
          />
        </div>
      </div>

    </DashboardLayout>
  
  );
}
