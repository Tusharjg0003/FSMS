'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return; // Still loading

    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      // Redirect based on user role
      const userRole = (session?.user as any)?.role;
      if (userRole === 'ADMIN' || userRole === 'SUPERVISOR') {
        router.push('/dashboard');
      } else if (userRole === 'TECHNICIAN') {
        router.push('/technician');
      } else {
        router.push('/auth/signin');
      }
    }
  }, [status, session, router]);

  // Show loading while determining where to redirect
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}
