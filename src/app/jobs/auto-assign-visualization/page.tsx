'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, MapPin, Clock, Users, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';

interface Technician {
  id: number;
  name: string;
  email: string;
  preferredWorkingLocation: string;
  preferredLatitude: number;
  preferredLongitude: number;
  preferredRadiusKm: number;
  isAvailable: boolean;
  currentJobsCount: number;
  distance: number | null;
  hasAvailability: boolean | null;
  hasTimeConflict: boolean | null;
  isEligible: boolean;
  isSelected?: boolean;
  reason?: string;
}

interface JobDetails {
  id: number;
  jobType: string;
  location: string;
  jobLatitude: number;
  jobLongitude: number;
  startTime: string;
  endTime: string;
  customerName?: string;
  companyName?: string;
  technicianId?: number;
  technician?: {
    id: number;
    name: string;
    email: string;
  };
}

interface AssignmentStep {
  step: number;
  title: string;
  description: string;
  technicians: Technician[];
  selectedTechnician?: Technician;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export default function AutoAssignVisualizationPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobId = searchParams.get('jobId');
  
  const [jobDetails, setJobDetails] = useState<JobDetails | null>(null);
  const [assignmentSteps, setAssignmentSteps] = useState<AssignmentStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [finalResult, setFinalResult] = useState<{
    success: boolean;
    selectedTechnician?: Technician;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && !['ADMIN', 'SUPERVISOR'].includes((session?.user as any)?.role)) {
      router.push('/dashboard');
    }
  }, [status, session, router]);

  useEffect(() => {
    if (jobId) {
      fetchJobDetails();
    }
  }, [jobId]);

  const fetchJobDetails = async () => {
    try {
      const res = await fetch(`/api/jobs/${jobId}`);
      if (res.ok) {
        const job = await res.json();
        setJobDetails({
          id: job.id,
          jobType: job.jobType.name,
          location: job.location,
          jobLatitude: job.jobLatitude,
          jobLongitude: job.jobLongitude,
          startTime: job.startTime,
          endTime: job.endTime,
          customerName: job.customerName,
          companyName: job.companyName,
          technicianId: job.technicianId,
          technician: job.technician
        });

        // Store assignment info for later use in visualization
        if (job.technicianId && job.technician) {
          // Don't set final result immediately - let the visualization show the process
          // We'll use this info in the assignment logic
        }
      }
    } catch (error) {
      console.error('Error fetching job details:', error);
    }
  };

  const startAutoAssignment = async () => {
    if (!jobDetails) return;
    
    setIsProcessing(true);
    setCurrentStep(0);
    setFinalResult(null);
    
    // Initialize steps with empty technicians arrays
    const steps: AssignmentStep[] = [
      {
        step: 1,
        title: "Fetching Technicians",
        description: "Retrieving all technicians from the database",
        technicians: [],
        status: 'processing'
      },
      {
        step: 2,
        title: "Filtering by Role",
        description: "Filtering technicians with TECHNICIAN role and isAvailable = true",
        technicians: [],
        status: 'pending'
      },
      {
        step: 3,
        title: "Checking Service Radius",
        description: "Calculating distances and filtering by service radius",
        technicians: [],
        status: 'pending'
      },
      {
        step: 4,
        title: "Checking Availability",
        description: "Verifying technicians have availability windows for the job time",
        technicians: [],
        status: 'pending'
      },
      {
        step: 5,
        title: "Checking Time Conflicts",
        description: "Ensuring no overlapping jobs during the same time period",
        technicians: [],
        status: 'pending'
      },
      {
        step: 6,
        title: "Selecting Best Match",
        description: "Choosing technician with shortest distance and lowest workload",
        technicians: [],
        status: 'pending'
      }
    ];
    
    setAssignmentSteps(steps);
    
    try {
      // Step 1: Fetch all technicians
      await updateStepWithTechnicians(0, 'processing', []);
      const techniciansRes = await fetch('/api/users?role=TECHNICIAN');
      const allTechnicians = await techniciansRes.json();
      
      // Add basic info to all technicians for step 1
      const allTechsWithBasicInfo = allTechnicians.map((tech: any) => ({
        ...tech,
        isEligible: true,
        reason: 'Retrieved from database',
        distance: null,
        hasAvailability: null,
        hasTimeConflict: null,
        currentJobsCount: 0
      }));
      
      await updateStepWithTechnicians(0, 'completed', allTechsWithBasicInfo);
      await updateStepWithTechnicians(1, 'processing', allTechsWithBasicInfo);
      
      // Step 2: Filter by role and availability
      const filteredTechnicians = allTechnicians.filter((tech: any) => 
        tech.role?.name === 'TECHNICIAN' && tech.isAvailable === true
      );
      
      const filteredTechsWithInfo = filteredTechnicians.map((tech: any) => ({
        ...tech,
        isEligible: true,
        reason: 'Has TECHNICIAN role and is available',
        distance: null,
        hasAvailability: null,
        hasTimeConflict: null,
        currentJobsCount: 0
      }));
      
      await updateStepWithTechnicians(1, 'completed', filteredTechsWithInfo);
      await updateStepWithTechnicians(2, 'processing', filteredTechsWithInfo);
      
      // Step 3: Calculate distances and filter by radius
      const techniciansWithDistance = await Promise.all(
        filteredTechnicians.map(async (tech: any) => {
          const distance = calculateDistance(
            jobDetails.jobLatitude,
            jobDetails.jobLongitude,
            tech.preferredLatitude,
            tech.preferredLongitude
          );
          
          const hasRadius = distance <= tech.preferredRadiusKm;
          
          return {
            ...tech,
            distance: Math.round(distance * 100) / 100,
            isEligible: hasRadius,
            reason: hasRadius ? `Within service radius (${Math.round(distance * 100) / 100}km <= ${tech.preferredRadiusKm}km)` : `Outside service radius (${Math.round(distance * 100) / 100}km > ${tech.preferredRadiusKm}km)`,
            hasAvailability: null,
            hasTimeConflict: null,
            currentJobsCount: 0
          };
        })
      );
      
      await updateStepWithTechnicians(2, 'completed', techniciansWithDistance);
      
      const radiusFiltered = techniciansWithDistance.filter(tech => tech.isEligible);
      await updateStepWithTechnicians(3, 'processing', radiusFiltered);
      
      // Step 4: Check availability windows (for all technicians, but only mark eligible those who passed radius)
      const techniciansWithAvailability = await Promise.all(
        techniciansWithDistance.map(async (tech: any) => {
          let hasAvailability = false;
          let availabilityReason = '';
          
          // Check availability for ALL technicians (for display purposes)
          try {
            const availabilityRes = await fetch(`/api/technician/availability?userId=${tech.id}&startTime=${jobDetails.startTime}&endTime=${jobDetails.endTime}`);
            const availability = await availabilityRes.json();
            hasAvailability = availability.hasAvailability;
            availabilityReason = availability.hasAvailability ? 'Available during job time' : 'No availability window for this time';
          } catch (error) {
            availabilityReason = 'Error checking availability';
          }
          
          // Only mark as eligible if they passed radius check AND have availability
          const isEligible = tech.isEligible && hasAvailability;
          
          return {
            ...tech,
            isEligible,
            reason: tech.isEligible ? availabilityReason : tech.reason, // Keep previous reason if already filtered out
            hasAvailability,
            hasTimeConflict: null,
            currentJobsCount: 0
          };
        })
      );
      
      await updateStepWithTechnicians(3, 'completed', techniciansWithAvailability);
      
      const availabilityFiltered = techniciansWithAvailability.filter(tech => tech.isEligible);
      await updateStepWithTechnicians(4, 'processing', techniciansWithAvailability); // Show ALL technicians, not just filtered ones
      
      // Step 5: Check for time conflicts (for all technicians, but only mark eligible those who passed previous checks)
      const techniciansWithConflictCheck = await Promise.all(
        techniciansWithAvailability.map(async (tech: any) => {
          let hasTimeConflict = false;
          let conflictReason = '';
          let currentJobsCount = 0;
          
          // Check conflicts for ALL technicians (for display purposes)
          try {
            // Check for conflicts
            const jobsRes = await fetch(`/api/jobs?technicianId=${tech.id}&status=pending,in_progress`);
            const jobs = await jobsRes.json();
            currentJobsCount = jobs.length;
            
            hasTimeConflict = jobs.some((job: any) => {
              const jobStart = new Date(job.startTime);
              const jobEnd = new Date(job.endTime);
              const newJobStart = new Date(jobDetails.startTime);
              const newJobEnd = new Date(jobDetails.endTime);
              
              return (jobStart < newJobEnd && jobEnd > newJobStart);
            });
            
            conflictReason = hasTimeConflict ? 'Has conflicting job during this time' : 'No time conflicts';
          } catch (error) {
            conflictReason = 'Error checking conflicts';
          }
          
          // Only mark as eligible if they passed all previous checks AND have no conflicts
          const isEligible = tech.isEligible && !hasTimeConflict;
          
          return {
            ...tech,
            isEligible,
            reason: tech.isEligible ? conflictReason : tech.reason, // Keep previous reason if already filtered out
            hasTimeConflict,
            currentJobsCount
          };
        })
      );
      
      await updateStepWithTechnicians(4, 'completed', techniciansWithConflictCheck);
      
      const finalEligible = techniciansWithConflictCheck.filter(tech => tech.isEligible);
      await updateStepWithTechnicians(5, 'processing', techniciansWithConflictCheck); // Show ALL technicians, not just filtered ones
      
      // Step 6: Select best match or show already assigned
      let selected: Technician | null = null;
      let finalMessage = '';
      let isAlreadyAssigned = false;
      
      // Check if job is already assigned
      if (jobDetails && jobDetails.technicianId) {
        const assignedTech = techniciansWithConflictCheck.find(tech => tech.id === jobDetails.technicianId);
        if (assignedTech) {
          selected = assignedTech;
          isAlreadyAssigned = true;
          finalMessage = `Job is already assigned to ${assignedTech.name}`;
        }
      }
      
      if (!selected && finalEligible.length === 0) {
        setFinalResult({
          success: false,
          message: 'No suitable technician found. All technicians are either outside service radius, unavailable, or have conflicting jobs.'
        });
        await updateStepWithTechnicians(5, 'failed', techniciansWithConflictCheck);
      } else if (!selected) {
        // Sort by distance, then by workload
        const sorted = finalEligible.sort((a, b) => {
          if (a.distance !== b.distance) {
            return a.distance - b.distance;
          }
          return a.currentJobsCount - b.currentJobsCount;
        });
        
        selected = sorted[0];
        finalMessage = `Selected ${selected.name} - closest distance (${selected.distance}km) with lowest workload (${selected.currentJobsCount} jobs)`;
      }
      
      if (selected) {
        // Mark the selected technician and update their eligibility status
        const finalTechsWithSelection = techniciansWithConflictCheck.map(tech => ({
          ...tech,
          isSelected: tech.id === selected.id,
          isEligible: tech.id === selected.id || tech.isEligible, // Show selected tech as eligible
          reason: tech.id === selected.id ? 'Selected as best match' : tech.reason
        }));
        
        setFinalResult({
          success: true,
          selectedTechnician: selected,
          message: finalMessage
        });
        
        await updateStepWithTechnicians(5, 'completed', finalTechsWithSelection);
      }
      
    } catch (error) {
      console.error('Auto-assignment error:', error);
      setFinalResult({
        success: false,
        message: 'An error occurred during auto-assignment process'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const updateStep = async (stepIndex: number, status: 'processing' | 'completed' | 'failed') => {
    setAssignmentSteps(prev => {
      const updated = [...prev];
      updated[stepIndex].status = status;
      return updated;
    });
    
    setCurrentStep(stepIndex);
    
    // Add a small delay for better visualization
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  const updateStepWithTechnicians = async (stepIndex: number, status: 'processing' | 'completed' | 'failed', technicians: Technician[]) => {
    setAssignmentSteps(prev => {
      const updated = [...prev];
      updated[stepIndex].status = status;
      updated[stepIndex].technicians = technicians;
      return updated;
    });
    
    setCurrentStep(stepIndex);
    
    // Add a small delay for better visualization
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const getStepIcon = (stepStatus: string) => {
    switch (stepStatus) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'processing':
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />;
    }
  };

  const getStepColor = (stepStatus: string) => {
    switch (stepStatus) {
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'processing':
        return 'bg-blue-50 border-blue-200';
      case 'failed':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!session || !['ADMIN', 'SUPERVISOR'].includes((session?.user as any)?.role)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Auto-Assignment Visualization</h1>
              <p className="text-gray-600 mt-1">See how the system selects the best technician for this job</p>
            </div>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Back
            </button>
          </div>
        </div>

        {/* Job Details */}
        {jobDetails && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Job Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Job Type</p>
                <p className="font-medium">{jobDetails.jobType}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Location</p>
                <p className="font-medium">{jobDetails.location}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Time</p>
                <p className="font-medium">
                  {new Date(jobDetails.startTime).toLocaleString()} - {new Date(jobDetails.endTime).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Customer</p>
                <p className="font-medium">
                  {jobDetails.customerName || 'N/A'}
                  {jobDetails.companyName && ` (${jobDetails.companyName})`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Start Button */}
        {!isProcessing && !finalResult && (
          <div className="text-center mb-8">
            <button
              onClick={startAutoAssignment}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium text-lg"
            >
              Start Auto-Assignment Process
            </button>
          </div>
        )}

        {/* Assignment Steps */}
        {assignmentSteps.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Assignment Process</h2>
            <div className="space-y-4">
              {assignmentSteps.map((step, index) => (
                <div
                  key={step.step}
                  className={`p-4 rounded-lg border-2 transition-all ${getStepColor(step.status)}`}
                >
                  <div className="flex items-center space-x-4">
                    {getStepIcon(step.status)}
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{step.title}</h3>
                      <p className="text-sm text-gray-600">{step.description}</p>
                      {step.technicians.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm font-medium text-gray-700 mb-3">
                            {step.technicians.length} technician(s) - {step.technicians.filter(t => t.isEligible).length} eligible
                          </p>
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {step.technicians.map((tech) => (
                              <div
                                key={tech.id}
                                className={`p-3 rounded-lg border text-sm ${
                                  tech.isSelected 
                                    ? 'bg-green-100 border-green-300 ring-2 ring-green-500' 
                                    : tech.isEligible 
                                      ? 'bg-blue-50 border-blue-200' 
                                      : 'bg-gray-50 border-gray-200'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2">
                                      <span className="font-medium text-gray-900">{tech.name}</span>
                                      {tech.isSelected && (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                          SELECTED
                                        </span>
                                      )}
                                      {!tech.isSelected && tech.isEligible && (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                          ELIGIBLE
                                        </span>
                                      )}
                                      {!tech.isEligible && (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                          FILTERED OUT
                                        </span>
                                      )}
                                    </div>
                                    <div className="mt-1 text-xs text-gray-600">
                                      <div>Location: {tech.preferredWorkingLocation}</div>
                                      {tech.distance !== null && (
                                        <div>Distance: {tech.distance}km (Radius: {tech.preferredRadiusKm}km)</div>
                                      )}
                                      {tech.currentJobsCount > 0 && (
                                        <div>Current Jobs: {tech.currentJobsCount}</div>
                                      )}
                                      {tech.hasAvailability !== null && (
                                        <div>Available: {tech.hasAvailability ? 'Yes' : 'No'}</div>
                                      )}
                                      {tech.hasTimeConflict !== null && (
                                        <div>Time Conflict: {tech.hasTimeConflict ? 'Yes' : 'No'}</div>
                                      )}
                                    </div>
                                    <div className="mt-1 text-xs font-medium">
                                      <span className={tech.isEligible ? 'text-green-700' : 'text-red-700'}>
                                        {tech.reason}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="ml-3">
                                    {tech.isSelected ? (
                                      <CheckCircle className="h-5 w-5 text-green-600" />
                                    ) : tech.isEligible ? (
                                      <CheckCircle className="h-5 w-5 text-blue-600" />
                                    ) : (
                                      <XCircle className="h-5 w-5 text-gray-400" />
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    {index < assignmentSteps.length - 1 && step.status === 'completed' && (
                      <ArrowRight className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Final Result */}
        {finalResult && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Assignment Result</h2>
            <div className={`p-4 rounded-lg ${finalResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-center space-x-3">
                {finalResult.success ? (
                  <CheckCircle className="h-6 w-6 text-green-600" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-600" />
                )}
                <div>
                  <p className={`font-medium ${finalResult.success ? 'text-green-800' : 'text-red-800'}`}>
                    {finalResult.success ? 'Assignment Successful!' : 'Assignment Failed'}
                  </p>
                  <p className={`text-sm ${finalResult.success ? 'text-green-700' : 'text-red-700'}`}>
                    {finalResult.message}
                  </p>
                </div>
              </div>
              
              {finalResult.success && finalResult.selectedTechnician && (
                <div className="mt-4 p-4 bg-white rounded-lg border border-green-200">
                  <h3 className="font-medium text-gray-900 mb-4">Selected Technician Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-600">Name</p>
                        <p className="font-medium">{finalResult.selectedTechnician.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Email</p>
                        <p className="font-medium">{finalResult.selectedTechnician.email}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Preferred Location</p>
                        <p className="font-medium">{finalResult.selectedTechnician.preferredWorkingLocation}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Service Radius</p>
                        <p className="font-medium">{finalResult.selectedTechnician.preferredRadiusKm}km</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-600">Distance to Job</p>
                        <p className="font-medium text-green-600">{finalResult.selectedTechnician.distance}km</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Current Jobs</p>
                        <p className="font-medium">{finalResult.selectedTechnician.currentJobsCount}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Availability</p>
                        <p className="font-medium text-green-600">Available</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Time Conflicts</p>
                        <p className="font-medium text-green-600">None</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-800">
                      <strong>Selection Criteria:</strong> This technician was chosen because they have the shortest distance to the job location and the lowest current workload among all eligible technicians.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
