'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import GoogleMapsTechnicianTracker from '../../../components/GoogleMapsTechnicianTracker';

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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Technician Location Tracking</h1>
          <p className="text-gray-700 mt-2">
            Monitor real-time locations of all technicians in the field
          </p>
        </div>
        
        <GoogleMapsTechnicianTracker 
          showHistory={true}
          refreshInterval={30000} // 30 seconds
        />
      </div>
    </div>
  );
}
