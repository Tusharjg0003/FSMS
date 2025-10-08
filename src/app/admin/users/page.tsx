// 'use client';

// import { useSession } from 'next-auth/react';
// import { useRouter } from 'next/navigation';
// import { useEffect, useState, useCallback } from 'react';
// import Link from 'next/link';
// import DashboardLayout from '@/components/DashboardLayout';

// interface User {
//   id: number;
//   name: string;
//   email: string;
//   role: {
//     name: string;
//   };
// }

// function Overlay({ children }: { children: React.ReactNode }) {
//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
//       <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">{children}</div>
//     </div>
//   );
// }

// export function useConfirm() {
//   const [state, setState] = useState<{
//     open: boolean;
//     message: string;
//     resolve?: (v: boolean) => void;
//   }>({ open: false, message: '' });

//   const ask = useCallback((message: string) => {
//     return new Promise<boolean>((resolve) => {
//       setState({ open: true, message, resolve });
//     });
//   }, []);

//   const ConfirmModal = state.open ? (
//     <Overlay>
//       <div className="p-6">
//         <h3 className="text-lg font-semibold text-gray-900 mb-3">Are you sure?</h3>
//         <p className="text-gray-700 mb-6">{state.message}</p>
//         <div className="flex justify-end gap-2">
//           <button
//             className="px-4 py-2 rounded-md border bg-white hover:bg-gray-50"
//             onClick={() => {
//               state.resolve?.(false);
//               setState((s) => ({ ...s, open: false }));
//             }}
//           >
//             Cancel
//           </button>
//           <button
//             className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700"
//             onClick={() => {
//               state.resolve?.(true);
//               setState((s) => ({ ...s, open: false }));
//             }}
//           >
//             Delete
//           </button>
//         </div>
//       </div>
//     </Overlay>
//   ) : null;

//   return { ask, ConfirmModal };
// }

// export function useNotice() {
//   const [notice, setNotice] = useState<{ open: boolean; title?: string; message?: string }>({
//     open: false,
//   });

//   const show = useCallback((message: string, title = 'Notice') => {
//     setNotice({ open: true, title, message });
//   }, []);

//   const NoticeModal = notice.open ? (
//     <Overlay>
//       <div className="p-6">
//         <h3 className="text-lg font-semibold text-gray-900 mb-3">{notice.title}</h3>
//         <p className="text-gray-700 mb-6 whitespace-pre-line">{notice.message}</p>
//         <div className="flex justify-end">
//           <button
//             className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
//             onClick={() => setNotice({ open: false })}
//           >
//             OK
//           </button>
//         </div>
//       </div>
//     </Overlay>
//   ) : null;

//   return { show, NoticeModal };
// }


// export default function AdminUsersPage() {
//   const { data: session, status } = useSession();
//   const router = useRouter();
//   const [users, setUsers] = useState<User[]>([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     if (status === 'unauthenticated') {
//       router.push('/auth/signin');
//     } else if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
//       router.push('/dashboard');
//     }
//   }, [status, session, router]);

//   useEffect(() => {
//     if (session?.user?.role === 'ADMIN') {
//       fetchUsers();
//     }
//   }, [session]);

//   const fetchUsers = async () => {
//     setLoading(true);
//     try {
//       const res = await fetch('/api/users');
//       if (res.ok) {
//         const data = await res.json();
//         setUsers(data);
//       }
//     } catch (error) {
//       console.error('Error fetching users:', error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // const handleDelete = async (id: number) => {
//   //   if (!window.confirm('Are you sure you want to delete this user?')) return;
//   //   try {
//   //     const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
//   //     if (res.ok) {
//   //       setUsers((prev) => prev.filter((u) => u.id !== id));
//   //     } else {
//   //       alert('Failed to delete user');
//   //     }
//   //   } catch (error) {
//   //     alert('Error deleting user');
//   //   }
//   // };

//   const handleDelete = async (id: number) => {
//     if (!window.confirm('Are you sure you want to delete this user?')) return;

//     try {
//       const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });

//       if (res.ok) {
//         setUsers(prev => prev.filter(u => u.id !== id));
//         return;
//       }

//       // Read raw text first; try JSON parse; fall back to raw
//       const raw = await res.text();
//       let body: any = {};
//       try { body = JSON.parse(raw); } catch { /* not JSON */ }

//       // Helpful debug in console
//       console.log('DELETE /api/admin/users/:id failed', {
//         status: res.status,
//         raw,
//         parsed: body
//       });

//       if (res.status === 409) {
//         const incomplete =
//           body?.counts?.incomplete ??
//           body?.counts?.active ?? // fallback if an older server is running
//           0;

//         alert(
//           `Cannot delete technician: ${body?.reason || 'Technician still has incomplete jobs.'}\n` +
//           `Incomplete jobs: ${incomplete}`
//         );
//         return;
//       }


//       if (res.status === 400 || res.status === 401) {
//         alert(body?.error || `Request not allowed (status ${res.status}).`);
//         return;
//       }

//       // Show whatever came back to avoid the unhelpful generic
//       alert(body?.error || body?.message || `Failed to delete user (status ${res.status}).\n${raw || ''}`);
//     } catch (e) {
//       alert('Error deleting user');
//     }
//   };




//   // Role color mapping function
//   const getRoleColors = (roleName: string) => {
//     const roleUpper = roleName.toUpperCase();
//     switch (roleUpper) {
//       case 'ADMIN':
//         return {
//           bg: 'bg-red-100',
//           text: 'text-red-800',
//           border: 'border-red-200'
//         };
//       case 'SUPERVISOR':
//         return {
//           bg: 'bg-orange-100',
//           text: 'text-orange-800',
//           border: 'border-orange-200'
//         };
//       case 'TECHNICIAN':
//         return {
//           bg: 'bg-blue-100',
//           text: 'text-blue-800',
//           border: 'border-blue-200'
//         };
//       default:
//         return {
//           bg: 'bg-gray-100',
//           text: 'text-gray-800',
//           border: 'border-gray-200'
//         };
//     }
//   };

//   // Get row background color based on role
//   const getRowBgColor = (roleName: string) => {
//     const roleUpper = roleName.toUpperCase();
//     switch (roleUpper) {
//       case 'ADMIN':
//         return 'bg-red-50 hover:bg-red-100';
//       case 'SUPERVISOR':
//         return 'bg-orange-50 hover:bg-orange-100';
//       case 'TECHNICIAN':
//         return 'bg-blue-50 hover:bg-blue-100';
//       default:
//         return 'bg-white hover:bg-gray-50';
//     }
//   };

//   if (status === 'loading' || loading) {
//     return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
//   }

//   if (!session || session.user?.role !== 'ADMIN') {
//     return null;
//   }

//   return (
//     <DashboardLayout>
//       <div className="min-h-screen">
//         <div className="mx-auto py-8 px-4">
//           <div className="flex justify-between items-center mb-6">
//             <div>
//               <h1 className="text-3xl font-bold text-gray-900 mb-2">User Management</h1>
//               {/* Role Legend */}
//               <div className="flex flex-wrap gap-4 text-sm">
//                 <div className="flex items-center gap-2">
//                   <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
//                   <span className="text-gray-600">Admin</span>
//                 </div>
//                 <div className="flex items-center gap-2">
//                   <div className="w-3 h-3 bg-orange-100 border border-orange-200 rounded"></div>
//                   <span className="text-gray-600">Supervisor</span>
//                 </div>
//                 <div className="flex items-center gap-2">
//                   <div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded"></div>
//                   <span className="text-gray-600">Technician</span>
//                 </div>
//               </div>
//             </div>
//             <Link
//               href="/admin/users/create"
//               className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
//             >
//               Add User
//             </Link>
//           </div>
          
//           <div className="bg-white shadow rounded-lg overflow-hidden">
//             <div className="overflow-x-auto">
//               <table className="min-w-full divide-y divide-gray-200">
//                 <thead className="bg-gray-50">
//                   <tr>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Name
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Email
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Role
//                     </th>
//                     <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Actions
//                     </th>
//                   </tr>
//                 </thead>
//                 <tbody className="divide-y divide-gray-200">
//                   {users.map((user) => {
//                     const roleColors = getRoleColors(user.role?.name || '');
//                     const rowBgColor = getRowBgColor(user.role?.name || '');
                    
//                     return (
//                       <tr key={user.id} className={`${rowBgColor} transition-colors`}>
//                         <td className="px-6 py-4 whitespace-nowrap">
//                           <div className="text-sm font-medium text-gray-900">{user.name}</div>
//                         </td>
//                         <td className="px-6 py-4 whitespace-nowrap">
//                           <div className="text-sm text-gray-900">{user.email}</div>
//                         </td>
//                         <td className="px-6 py-4 whitespace-nowrap">
//                           <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${roleColors.bg} ${roleColors.text} ${roleColors.border}`}>
//                             {user.role?.name || 'Unknown'}
//                           </span>
//                         </td>
//                         <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
//                           <div className="flex justify-end gap-2">
//                             <Link
//                               href={`/admin/users/${user.id}`}
//                               className="text-blue-600 hover:text-blue-900 hover:underline transition-colors"
//                             >
//                               Edit
//                             </Link>
//                             <button
//                               className="text-red-600 hover:text-red-900 hover:underline transition-colors"
//                               onClick={() => handleDelete(user.id)}
//                               type="button"
//                             >
//                               Delete
//                             </button>
//                           </div>
//                         </td>
//                       </tr>
//                     );
//                   })}
//                 </tbody>
//               </table>
              
//               {users.length === 0 && (
//                 <div className="text-center py-12">
//                   <div className="text-gray-500 text-sm">No users found</div>
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>
//       </div>
//     </DashboardLayout>
//   );
// }


'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react'; // <-- add this for the Overlay prop type
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import {  IconEdit, IconTrash } from '@tabler/icons-react';

interface User {
  id: number;
  name: string;
  email: string;
  role: { name: string };
  preferredWorkingLocation?: string;
  preferredLatitude?: number;
  preferredLongitude?: number;
  preferredRadiusKm?: number;
  isAvailable?: boolean;
}

function Overlay({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">{children}</div>
    </div>
  );
}

function useConfirm() {
  const [state, setState] = useState<{ open: boolean; message: string; resolve?: (v: boolean) => void }>({
    open: false,
    message: '',
  });

  const ask = useCallback((message: string) => {
    return new Promise<boolean>((resolve) => setState({ open: true, message, resolve }));
  }, []);

  const ConfirmModal = state.open ? (
    <Overlay>
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Are you sure?</h3>
        <p className="text-gray-700 mb-6">{state.message}</p>
        <div className="flex justify-end gap-2">
          <button
            className="px-4 py-2 rounded-md border bg-white hover:bg-gray-50"
            onClick={() => {
              state.resolve?.(false);
              setState((s) => ({ ...s, open: false }));
            }}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700"
            onClick={() => {
              state.resolve?.(true);
              setState((s) => ({ ...s, open: false }));
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </Overlay>
  ) : null;

  return { ask, ConfirmModal };
}

function useNotice() {
  const [notice, setNotice] = useState<{ open: boolean; title?: string; message?: string }>({ open: false });

  const show = useCallback((message: string, title = 'Notice') => {
    setNotice({ open: true, title, message });
  }, []);

  const NoticeModal = notice.open ? (
    <Overlay>
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">{notice.title}</h3>
        <p className="text-gray-700 mb-6 whitespace-pre-line">{notice.message}</p>
        <div className="flex justify-end">
          <button className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700" onClick={() => setNotice({ open: false })}>
            OK
          </button>
        </div>
      </div>
    </Overlay>
  ) : null;

  return { show, NoticeModal };
}

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showModal, setShowModal] = useState(false);

  // NEW: use the hooks
  const { ask, ConfirmModal } = useConfirm();
  const { show, NoticeModal } = useNotice();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && (session?.user as any)?.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [status, session, router]);

  useEffect(() => {
    if ((session?.user as any)?.role === 'ADMIN') {
      fetchUsers();
    }
  }, [session]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) setUsers(await res.json());
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  // UPDATED: use ask/show instead of confirm/alert
  const handleDelete = async (id: number) => {
    const user = users.find(u => u.id === id);
    const userName = user?.name || 'User';
    const userRole = user?.role?.name || 'user';
    
    if (!window.confirm(`Are you sure you want to delete ${userName} (${userRole})? This action cannot be undone.`)) return;
    
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      const data = await res.json();
      
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== id));
        alert(`${userName} deleted successfully!`);
      } else {
        alert(data.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Error deleting user');
    }
  };

  const handleViewDetails = (user: User) => {
    setSelectedUser(user);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedUser(null);
  };

  // Role color mapping function
  const getRoleColors = (roleName: string) => {
    switch (roleName.toUpperCase()) {
      case 'ADMIN':
        return {
          bg: 'bg-orange-100',
          text: 'text-orange-800',
          border: 'border-orange-200'
        };
      case 'SUPERVISOR':
        return {
          bg: 'bg-teal-100',
          text: 'text-teal-800',
          border: 'border-teal-200'
        };
      case 'TECHNICIAN':
        return { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' };
    }
  };

  

  if (status === 'loading' || loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen">
        <div className="mx-auto py-8 px-4">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">User Management</h1>
            </div>
            <Link href="/admin/users/create" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
              Add User
            </Link>
          </div>

          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map((user) => {
                    const roleColors = getRoleColors(user.role?.name || '');

                    
                    return (
                      <tr key={user.id} >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{user.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${roleColors.bg} ${roleColors.text} ${roleColors.border}`}>
                            {user.role?.name || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleViewDetails(user)}
                              className="text-green-600 hover:text-green-900 hover:underline transition-colors"
                              type="button"
                            >
                              View Details
                            </button>
                            <Link
                              href={`/admin/users/${user.id}`}
                              className="text-blue-600 hover:text-blue-900 hover:underline transition-colors"
                            >
                              <IconEdit className="h-5 w-5" />
                            </Link>
                            <button
                              className="text-red-600 hover:text-red-900 hover:underline transition-colors"
                              onClick={() => handleDelete(user.id)}
                              type="button"
                            >
                              <IconTrash className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {users.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-gray-500 text-sm">No users found</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* User Details Modal */}
      {showModal && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">User Details</h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600"
                  type="button"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedUser.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedUser.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Role</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedUser.role?.name}</p>
                  </div>
                  {selectedUser.role?.name === 'TECHNICIAN' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Status</label>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          selectedUser.isAvailable 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {selectedUser.isAvailable ? 'Available' : 'Not Available'}
                        </span>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Preferred Location</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {selectedUser.preferredWorkingLocation || 'Not set'}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Service Radius</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {selectedUser.preferredRadiusKm || 10} km
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Coordinates</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {selectedUser.preferredLatitude && selectedUser.preferredLongitude
                            ? `(${selectedUser.preferredLatitude}, ${selectedUser.preferredLongitude})`
                            : 'Not set'
                          }
                        </p>
                      </div>
                    </>
                  )}
                </div>
                
                {selectedUser.role?.name === 'TECHNICIAN' && (
                  <div className="mt-6 pt-4 border-t">
                    <h4 className="text-md font-medium text-gray-900 mb-3">Service Area Information</h4>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="text-sm text-blue-800">
                        <p><strong>Working Location:</strong> {selectedUser.preferredWorkingLocation || 'Not specified'}</p>
                        <p><strong>Service Coverage:</strong> {selectedUser.preferredRadiusKm || 10} km radius</p>
                        <p><strong>Center Point:</strong> {
                          selectedUser.preferredLatitude && selectedUser.preferredLongitude
                            ? `${selectedUser.preferredLatitude}, ${selectedUser.preferredLongitude}`
                            : 'Not configured'
                        }</p>
                        <p><strong>Availability:</strong> {selectedUser.isAvailable ? 'Active for job assignments' : 'Currently unavailable'}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={closeModal}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 px-4 rounded-md text-sm font-medium"
                  type="button"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    closeModal();
                    handleDelete(selectedUser.id);
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md text-sm font-medium"
                  type="button"
                >
                  Delete User
                </button>
                <Link
                  href={`/admin/users/${selectedUser.id}`}
                  className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md text-sm font-medium"
                >
                  Edit User
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
