'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';

interface JobType {
  id: number;
  name: string;
  description?: string;
}

interface Technician {
  id: number;
  name: string;
  email: string;
}

// helper: format current local time to 'YYYY-MM-DDTHH:mm' for <input type="datetime-local">
function formatLocalForDatetimeLocal(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

export default function CreateJobPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [jobTypes, setJobTypes] = useState<JobType[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedTechnicians, setSelectedTechnicians] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    // Customer/Company Information
    clientName: '',
    companyName: '',
    phoneNumber: '',
    email: '',
    // Job Information
    jobTypeId: '',
    jobSource: '',
    toolsRequired: '',
    // Structured address fields
    address: '',
    city: '',
    state: '',
    postcode: '',
    customCity: '',
    // Legacy location field (will be constructed from structured fields)
    location: '',
    jobLatitude: '',
    jobLongitude: '',
    startTime: '',
    endTime: '',
    status: 'pending'
  });

  // NEW: auto-assign toggle + conflict list
  const [autoAssign, setAutoAssign] = useState(false);
  const [conflicts, setConflicts] = useState<any[]>([]);

  // Default date-times (computed once)
  const defaults = useMemo(() => {
    const now = new Date();
    const plus1h = new Date(now.getTime() + 60 * 60 * 1000);
    return {
      start: formatLocalForDatetimeLocal(now),
      end: formatLocalForDatetimeLocal(plus1h),
    };
  }, []);

  // Auth gating
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (
      status === 'authenticated' &&
      (session?.user as any)?.role !== 'ADMIN'
    ) {
      router.push('/dashboard');
    }
  }, [status, session, router]);

  // Bootstrap data
  useEffect(() => {
    if (status === 'authenticated') {
      fetchJobTypes();
      fetchTechnicians();
    }
  }, [status]);

  const fetchJobTypes = async () => {
    try {
      const response = await fetch('/api/admin/job-types');
      if (response.ok) setJobTypes(await response.json());
    } catch (err) {
      console.error('Error fetching job types:', err);
    }
  };

  const fetchTechnicians = async () => {
    try {
      const response = await fetch('/api/users?role=TECHNICIAN');
      if (response.ok) setTechnicians(await response.json());
    } catch (err) {
      console.error('Error fetching technicians:', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleTechnician = (technicianId: number) => {
    setSelectedTechnicians(prev => 
      prev.includes(technicianId) 
        ? prev.filter(id => id !== technicianId)
        : [...prev, technicianId]
    );
  };

  const resetForm = () => {
    setFormData({
      clientName: '',
      companyName: '',
      phoneNumber: '',
      email: '',
      jobTypeId: '',
      jobSource: '',
      toolsRequired: '',
      address: '',
      city: '',
      state: '',
      postcode: '',
      customCity: '',
      location: '',
      jobLatitude: '',
      jobLongitude: '',
      startTime: '',
      endTime: '',
      status: 'pending'
    });
    setSelectedTechnicians([]);
    setError('');
    setConflicts([]);
  };

  // Function to construct full location string from structured address fields
  const constructLocationString = () => {
    const parts = [];
    
    if (formData.address) parts.push(formData.address);
    
    const city = formData.city === 'Other' ? formData.customCity : formData.city;
    if (city) parts.push(city);
    
    if (formData.state) parts.push(formData.state);
    if (formData.postcode) parts.push(formData.postcode);
    
    parts.push('Malaysia');
    
    return parts.join(', ');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setConflicts([]);

    // Construct location string from structured fields
    const fullLocation = constructLocationString();

    const jobData = {
      jobTypeId: formData.jobTypeId,
      status: formData.status,
      startTime: formData.startTime,
      endTime: formData.endTime || null,
      location: fullLocation,
      technicianId: autoAssign ? null : (selectedTechnicians.length > 0 ? selectedTechnicians[0] : null),
      jobLatitude: formData.jobLatitude ? Number(formData.jobLatitude) : null,
      jobLongitude: formData.jobLongitude ? Number(formData.jobLongitude) : null,
      // Structured address components for better geocoding
      address: formData.address,
      city: formData.city,
      state: formData.state,
      postcode: formData.postcode,
      customCity: formData.customCity,
      // Customer/Company Information
      customerName: formData.clientName,
      companyName: formData.companyName,
      phoneNumber: formData.phoneNumber,
      email: formData.email,
      // Additional fields
      jobSource: formData.jobSource,
      toolsRequired: formData.toolsRequired
    };

    try {
      const response = await fetch(`/api/jobs${autoAssign ? '?autoAssign=true' : ''}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jobData),
      });

      if (response.status === 409) {
        const data = await response.json();
        setError(data.error || 'Scheduling conflict');
        setConflicts(data.conflicts || []);
        setLoading(false);
        return;
      }

      if (response.ok) {
        const responseData = await response.json();
        
        // Check if auto-assignment failed
        if (responseData.autoAssignFailed) {
          setError(responseData.message);
          // Show suggestion for manual selection
          setConflicts([{
            message: responseData.suggestion,
            type: 'info'
          }]);
          // Disable auto-assign and enable manual selection
          setAutoAssign(false);
        } else {
          // If auto-assigned, redirect with job ID for potential visualization
          const redirectUrl = autoAssign 
            ? `/jobs?message=Job created successfully&jobId=${responseData.id}&autoAssigned=true`
            : '/jobs?message=Job created successfully';
          router.push(redirectUrl);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create job');
      }
    } catch (err) {
      setError('An error occurred while creating the job');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/jobs"
              className="text-blue-600 hover:text-blue-900 text-sm font-medium mb-4 inline-block"
            >
              Back to Jobs
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Job</h1>
            <p className="text-gray-600">Fill out the form below to create a new field service job</p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
              {conflicts.length > 0 && (
                <div className={`border px-4 py-3 rounded ${
                  conflicts[0]?.type === 'info' 
                    ? 'bg-blue-50 border-blue-200 text-blue-800' 
                    : 'bg-yellow-50 border-yellow-200 text-yellow-800'
                }`}>
                  {conflicts[0]?.type === 'info' ? (
                    <div>
                      <div className="font-semibold mb-2">Auto-assignment Information:</div>
                      <p>{conflicts[0].message}</p>
                    </div>
                  ) : (
                    <div>
                      <div className="font-semibold mb-2">Conflicting assignments:</div>
                      <ul className="list-disc ml-5 space-y-1">
                        {conflicts.map((c) => (
                          <li key={c.id}>
                            #{c.id} - {c.jobType ?? ''} - {new Date(c.startTime).toLocaleString()} - {c.endTime ? new Date(c.endTime).toLocaleString() : 'N/A'} - {c.status}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Job Info */}
            <div className="bg-blue-50 p-8 rounded-2xl shadow-lg border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">Job Details</h2>
              
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {/* Customer Information */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    name="clientName"
                    value={formData.clientName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 bg-blue-100 border-2 border-blue-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors text-gray-700"
                    placeholder="Enter customer name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Company Name
                  </label>
                  <input
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-blue-100 border-2 border-blue-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors text-gray-700"
                    placeholder="Enter company name (optional)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 bg-blue-100 border-2 border-blue-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors text-gray-700"
                    placeholder="Enter phone number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-blue-100 border-2 border-blue-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors text-gray-700"
                    placeholder="Enter email address (optional)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Job Type *
                  </label>
                  <select
                    name="jobTypeId"
                    value={formData.jobTypeId}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 bg-blue-100 border-2 border-blue-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors text-gray-700"
                  >
                    <option value="">Select a job type</option>
                    {jobTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Status *
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 bg-blue-100 border-2 border-blue-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors text-gray-700"
                  >
                    <option value="pending">Pending</option>
                    <option value="in progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                {/* Structured Address Fields */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Address *
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address || ''}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 bg-blue-100 border-2 border-blue-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors text-gray-700"
                    placeholder="e.g., 123 Jalan Ampang, Taman Melawati"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    City *
                  </label>
                  <select
                    name="city"
                    value={formData.city || ''}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 bg-blue-100 border-2 border-blue-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors text-gray-700"
                  >
                    <option value="">Select City</option>
                    <option value="Kuala Lumpur">Kuala Lumpur</option>
                    <option value="Petaling Jaya">Petaling Jaya</option>
                    <option value="Subang Jaya">Subang Jaya</option>
                    <option value="Shah Alam">Shah Alam</option>
                    <option value="Puchong">Puchong</option>
                    <option value="Putrajaya">Putrajaya</option>
                    <option value="Cyberjaya">Cyberjaya</option>
                    <option value="Klang">Klang</option>
                    <option value="Ampang">Ampang</option>
                    <option value="Cheras">Cheras</option>
                    <option value="Kepong">Kepong</option>
                    <option value="Other">Other (specify below)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    State *
                  </label>
                  <select
                    name="state"
                    value={formData.state || ''}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 bg-blue-100 border-2 border-blue-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors text-gray-700"
                  >
                    <option value="">Select State</option>
                    <option value="Kuala Lumpur">Kuala Lumpur</option>
                    <option value="Selangor">Selangor</option>
                    <option value="Putrajaya">Putrajaya</option>
                    <option value="Negeri Sembilan">Negeri Sembilan</option>
                    <option value="Perak">Perak</option>
                    <option value="Penang">Penang</option>
                    <option value="Johor">Johor</option>
                    <option value="Melaka">Melaka</option>
                    <option value="Pahang">Pahang</option>
                    <option value="Terengganu">Terengganu</option>
                    <option value="Kelantan">Kelantan</option>
                    <option value="Kedah">Kedah</option>
                    <option value="Perlis">Perlis</option>
                    <option value="Sabah">Sabah</option>
                    <option value="Sarawak">Sarawak</option>
                    <option value="Labuan">Labuan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Postcode
                  </label>
                  <input
                    type="text"
                    name="postcode"
                    value={formData.postcode || ''}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-blue-100 border-2 border-blue-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors text-gray-700"
                    placeholder="e.g., 50450"
                    maxLength={5}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Custom City (if "Other" selected)
                  </label>
                  <input
                    type="text"
                    name="customCity"
                    value={formData.customCity || ''}
                    onChange={handleInputChange}
                    disabled={formData.city !== 'Other'}
                    className="w-full px-4 py-3 bg-gray-100 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors text-gray-700 disabled:opacity-50"
                    placeholder="Enter custom city name"
                  />
                </div>

                {/* Coordinates for scheduling (optional - will auto-geocode from address) */}
                <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                  <h3 className="text-sm font-semibold text-green-800 mb-2">Location Coordinates (Optional)</h3>
                  <p className="text-xs text-green-700 mb-4">
                    Coordinates will be automatically determined from the address above. 
                    Only fill these if you have specific coordinates or want to override the geocoding.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Latitude
                      </label>
                      <input
                        type="number"
                        name="jobLatitude"
                        value={formData.jobLatitude}
                        onChange={handleInputChange}
                        step="any"
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 transition-colors text-gray-700"
                        placeholder="e.g., 3.0750"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Longitude
                      </label>
                      <input
                        type="number"
                        name="jobLongitude"
                        value={formData.jobLongitude}
                        onChange={handleInputChange}
                        step="any"
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 transition-colors text-gray-700"
                        placeholder="e.g., 101.6000"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Schedule Section */}
            <div className="bg-blue-50 p-8 rounded-2xl border border-blue-100">
              <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">Schedule</h2>
              <div className="mb-4 p-3 bg-blue-100 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>Time Zone:</strong> All times are in Malaysia Time (UTC+8). 
                  Technicians are available from 8:00 AM to 8:00 PM Malaysia Time.
                </p>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    From *
                  </label>
                  <input
                    type="datetime-local"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 bg-blue-100 border-2 border-blue-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors text-gray-700"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    To
                  </label>
                  <input
                    type="datetime-local"
                    name="endTime"
                    value={formData.endTime}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-blue-100 border-2 border-blue-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors text-gray-700"
                  />
                </div>

                <div aria-disabled={autoAssign}>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Assign Technicians
                  </label>
                  {!autoAssign && conflicts.some(c => c.type === 'info') && (
                    <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-700">
                        <strong>Auto-assignment failed.</strong> Please manually select a technician from the list below.
                      </p>
                    </div>
                  )}
                  {/* <div className="space-y-3 max-h-48 overflow-y-auto">
                    {technicians.map((technician) => (
                      <div key={technician.id} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`tech-${technician.id}`}
                          checked={selectedTechnicians.includes(technician.id)}
                          onChange={() => toggleTechnician(technician.id)}
                          className="w-4 h-4 text-blue-600 bg-blue-100 border-blue-300 rounded focus:ring-blue-500"
                        />
                        <label
                          htmlFor={`tech-${technician.id}`}
                          className="ml-3 text-sm font-medium text-gray-700 cursor-pointer"
                        >
                          {technician.name} ({technician.email})
                        </label>
                      </div>
                    ))}
                  </div> */}
                  <select
                    name="assignTechnician"
                    value={selectedTechnicians[0] || ''} // single selection
                    onChange={(e) => setSelectedTechnicians([Number(e.target.value)])}
                    required={!autoAssign}
                    disabled={autoAssign}
                    className="w-full px-4 py-3 bg-blue-100 border-2 border-blue-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors text-gray-700"
                  >
                    <option value="">Select a technician</option>
                    {technicians.map((technician) => (
                      <option key={technician.id} value={technician.id}>
                        {technician.name} ({technician.email})
                      </option>
                    ))}
                  </select>

                </div>
                
                {/* New-auto assign toggle */}
                <div className="flex items-center gap-2">
                  <input
                    id="autoAssign"
                    type="checkbox"
                    checked={autoAssign}
                    onChange={(e) => setAutoAssign(e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                  <label htmlFor="autoAssign" className="text-sm text-gray-700">
                    Auto-assign nearest available technician (uses coordinates)
                  </label>
                </div>
                
                {/* Visualization Link */}
                {autoAssign && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-700 mb-2">
                      <strong>Want to see how auto-assignment works?</strong>
                    </p>
                    <p className="text-xs text-blue-600 mb-3">
                      After creating the job, you can view a detailed step-by-step breakdown of how the system selects the best technician.
                    </p>
                    <div className="text-xs text-blue-600">
                      <strong>Tip:</strong> The visualization will show distance calculations, availability checks, and conflict detection in real-time.
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center space-x-6">
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-8 py-3 rounded-xl font-semibold text-lg transition-colors min-w-32"
              >
                {loading ? 'Creating...' : 'Create Job'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-500 hover:bg-gray-600 text-white px-8 py-3 rounded-xl font-semibold text-lg transition-colors min-w-32"
              >
                Reset
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}