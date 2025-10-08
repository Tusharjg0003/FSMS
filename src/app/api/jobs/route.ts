// import { NextRequest, NextResponse } from 'next/server';
// import { PrismaClient } from '@prisma/client';
// import { getServerSession } from 'next-auth';
// import { authOptions } from "@/lib/auth";

// const prisma = new PrismaClient();

// // GET - Fetch jobs based on user role
// export async function GET(request: NextRequest) {
//   try {
//     const session = await getServerSession(authOptions);
    
//     if (!session) {
//       return NextResponse.json(
//         { error: 'Unauthorized' },
//         { status: 401 }
//       );
//     }

//     const { searchParams } = new URL(request.url);
//     const status = searchParams.get('status');
//     const technicianId = searchParams.get('technicianId');

//     let whereClause: any = {};
    
//     // Filter by status if provided
//     if (status) {
//       whereClause.status = status;
//     }

//     // Filter by technician if user is a technician
//     if (session.user.role === 'TECHNICIAN') {
//       whereClause.technicianId = Number(session.user.id);
//     }

//     // Filter by specific technician if provided (for supervisors/admins)
//     if (technicianId && ['ADMIN', 'SUPERVISOR'].includes(session.user.role)) {
//       whereClause.technicianId = parseInt(technicianId);
//     }

//     const jobs = await prisma.job.findMany({
//       where: whereClause,
//       include: {
//         jobType: true,
//         technician: {
//           select: {
//             id: true,
//             name: true,
//             email: true,
//           },
//         },
//       },
//       orderBy: { startTime: 'desc' },
//     });

//     return NextResponse.json(jobs);
//   } catch (error) {
//     console.error('Error fetching jobs:', error);
//     return NextResponse.json(
//       { error: 'Failed to fetch jobs' },
//       { status: 500 }
//     );
//   }
// }

// // POST - Create a new job
// export async function POST(request: NextRequest) {
//   try {
//     const session = await getServerSession(authOptions);
    
//     if (!session || session.user.role !== 'ADMIN') {
//       return NextResponse.json(
//         { error: 'Unauthorized' },
//         { status: 401 }
//       );
//     }

//     const body = await request.json();
//     const { jobTypeId, status, startTime, endTime, location, technicianId } = body;

//     if (!jobTypeId || !status || !startTime || !location) {
//       return NextResponse.json(
//         { error: 'Missing required fields' },
//         { status: 400 }
//       );
//     }

//     const job = await prisma.job.create({
//       data: {
//         jobTypeId: parseInt(jobTypeId),
//         status,
//         startTime: new Date(startTime),
//         endTime: endTime ? new Date(endTime) : null,
//         location,
//         technicianId: technicianId ? parseInt(technicianId) : null,
//       },
//       include: {
//         jobType: true,
//         technician: {
//           select: {
//             id: true,
//             name: true,
//             email: true,
//           },
//         },
//       },
//     });

//     return NextResponse.json(job, { status: 201 });
//   } catch (error) {
//     console.error('Error creating job:', error);
//     return NextResponse.json(
//       { error: 'Failed to create job' },
//       { status: 500 }
//     );
//   }
// } 



import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/lib/auth";
import { autoAssignTechnician } from '@/lib/scheduling';
import { geocodeAddress, geocodeStructuredAddress, validateMalaysiaCoordinates, StructuredAddress } from '@/lib/geocoding';

const prisma = new PrismaClient();

// Treat open-ended jobs as 30 minutes by default when checking overlap
function hasOverlap(aStart: Date, aEnd: Date | null, bStart: Date, bEnd: Date | null) {
  const endA = aEnd ?? new Date(aStart.getTime() + 30 * 60 * 1000);
  const endB = bEnd ?? new Date(bStart.getTime() + 30 * 60 * 1000);
  return aStart < endB && bStart < endA;
}

// GET: list jobs with optional filters: status, technicianId, from, to
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const technicianId = searchParams.get('technicianId');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const where: any = {};
    if (status) where.status = status;

    // Technician can only see their own jobs; admin/supervisor can filter by technician
    if (session.user.role === 'TECHNICIAN') {
      where.technicianId = Number(session.user.id);
    } else if (technicianId) {
      where.technicianId = parseInt(technicianId);
    }

    // Window filter: any job that INTERSECTS [from, to)
    if (from || to) {
      const fromDate = from ? new Date(from) : undefined;
      const toDate = to ? new Date(to) : undefined;

      // Intersection condition: job.start < to && (job.end > from OR job.end IS NULL)
      where.AND = [
        toDate ? { startTime: { lt: toDate } } : {},
        fromDate ? { OR: [{ endTime: null }, { endTime: { gt: fromDate } }] } : {},
      ];
    }

    const jobs = await prisma.job.findMany({
      where,
      include: {
        jobType: true,
        technician: { select: { id: true, name: true, email: true } },
      },
      orderBy: { startTime: 'desc' },
    });

    return NextResponse.json(jobs);
  } catch (e) {
    console.error('Error fetching jobs:', e);
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
  }
}

// POST: create with conflict prevention and optional auto-assign (least-loaded available tech)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      jobTypeId, 
      status, 
      startTime, 
      endTime, 
      location, 
      technicianId, 
      jobLatitude, 
      jobLongitude,
      // Customer/Company Information
      customerName,
      companyName,
      phoneNumber,
      email,
      // Structured address components
      address,
      city,
      state,
      postcode,
      customCity
    } = body;

    if (!jobTypeId || !status || !startTime || !location) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : null;
    if (end && end <= start) {
      return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 });
    }

    // Fetch the current job type data to snapshot it
    const currentJobType = await prisma.jobType.findUnique({
      where: { id: parseInt(jobTypeId) },
      select: { id: true, name: true, description: true }
    });

    if (!currentJobType) {
      return NextResponse.json({ error: 'Job type not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const autoAssign = searchParams.get('autoAssign') === 'true';

    // Auto-geocode location if coordinates not provided
    let finalJobLatitude = jobLatitude;
    let finalJobLongitude = jobLongitude;
    let geocodingInfo = '';

    if (!jobLatitude || !jobLongitude) {
      let geocodingResult;
      
      // Use enhanced geocoding with better validation and fallback strategies
      if (address || city || state || postcode) {
        const structuredAddress: StructuredAddress = {
          address,
          city,
          state,
          postcode,
          customCity
        };
        
        console.log(`Auto-geocoding with structured address:`, structuredAddress);
        console.log(`Available functions:`, typeof geocodeStructuredAddress, typeof geocodeAddress);
        
        try {
          geocodingResult = await geocodeStructuredAddress(structuredAddress);
        } catch (error) {
          console.log(`Structured geocoding failed, falling back to basic:`, error instanceof Error ? error.message : String(error));
          // Fallback to basic geocoding if structured fails
          const fallbackQuery = [
            address,
            city === 'Other' ? customCity : city,
            state,
            postcode,
            'Malaysia'
          ].filter(Boolean).join(', ');
          
          geocodingResult = await geocodeAddress(fallbackQuery);
        }
      } else {
        console.log(`Auto-geocoding location: "${location}"`);
        geocodingResult = await geocodeAddress(location);
      }
      
      if ('error' in geocodingResult) {
        return NextResponse.json(
          { 
            error: 'Geocoding failed', 
            details: geocodingResult.message,
            suggestion: 'Please provide coordinates manually or use a more specific address'
          }, 
          { status: 400 }
        );
      }

      // Validate coordinates are in Malaysia
      if (!validateMalaysiaCoordinates(geocodingResult.latitude, geocodingResult.longitude)) {
        return NextResponse.json(
          { 
            error: 'Location outside Malaysia', 
            details: `Coordinates (${geocodingResult.latitude}, ${geocodingResult.longitude}) are outside Malaysia bounds`,
            suggestion: 'Please provide a Malaysian address or coordinates'
          }, 
          { status: 400 }
        );
      }

      finalJobLatitude = geocodingResult.latitude;
      finalJobLongitude = geocodingResult.longitude;
      geocodingInfo = ` (geocoded from: ${geocodingResult.formattedAddress})`;
      
      console.log(`Geocoding success: (${finalJobLatitude}, ${finalJobLongitude})`);
    }

    // Choose technician (either provided or auto-assigned)
    let assignedTechId: number | null = technicianId ? parseInt(technicianId) : null;

    // Skip old auto-assign logic - we'll use the new location-aware scheduler after job creation

    // If a technician is provided (or chosen), ensure available and do a final overlap check
    if (assignedTechId) {
      const tech = await prisma.user.findUnique({
        where: { id: assignedTechId },
      });
      if (!tech) {
        return NextResponse.json({ error: 'Technician not found' }, { status: 404 });
      }
      const overlaps = await prisma.job.findMany({
        where: {
          technicianId: assignedTechId,
          status: { notIn: ['cancelled', 'completed'] },
          startTime: { lt: end ?? new Date(start.getTime() + 24 * 60 * 60 * 1000) },
          OR: [{ endTime: null }, { endTime: { gt: start } }],
        },
        include: { jobType: true },
      });

      const conflicting = overlaps.filter((j) => hasOverlap(start, end, j.startTime, j.endTime));
      if (conflicting.length) {
        return NextResponse.json(
          {
            error: 'Scheduling conflict',
            conflicts: conflicting.map((c) => ({
              id: c.id,
              jobType: c.jobType.name,
              startTime: c.startTime,
              endTime: c.endTime,
              status: c.status,
            })),
          },
          { status: 409 }
        );
      }
    }

    // Create the job with snapshot
    const job = await prisma.job.create({
      data: {
        jobTypeId: parseInt(jobTypeId),
        // cast to align with current generated Prisma types
        ...( { jobTypeName: currentJobType.name } as any ),
        status,
        startTime: start,
        endTime: end,
        location: location + geocodingInfo,
        ...( { jobLatitude: finalJobLatitude ?? null, jobLongitude: finalJobLongitude ?? null } as any ),
        // Customer/Company Information
        customerName: customerName || null,
        companyName: companyName || null,
        phoneNumber: phoneNumber || null,
        email: email || null,
        technicianId: assignedTechId,
      },
      include: {
        jobType: true,
        technician: { select: { id: true, name: true, email: true } },
      },
    });

    // Track initial status history
    try {
      // Verify the user exists in the database before creating status history
      const userExists = await prisma.user.findUnique({
        where: { id: Number(session.user.id) },
        select: { id: true }
      });
      
      if (userExists) {
        await prisma.jobStatusHistory.create({
          data: {
            jobId: job.id,
            previousStatus: 'created',
            currentStatus: status,
            userId: Number(session.user.id),
          },
        });
      }
    } catch (historyError) {
      console.log('Warning: Could not create job status history:', historyError);
      // Continue without status history - job creation is more important
    }

    // If autoAssign enabled, try radius+window scheduler now that job is created (has coords)
    if (autoAssign && finalJobLatitude != null && finalJobLongitude != null) {
      const selected = await autoAssignTechnician(job.id);
      if (selected) {
        const updated = await prisma.job.update({ where: { id: job.id }, data: { technicianId: selected }, include: { jobType: true, technician: { select: { id: true, name: true, email: true } } } });
        return NextResponse.json(updated, { status: 201 });
      } else {
        // Auto-assignment failed - return job with message to manually select technician
        return NextResponse.json({
          ...job,
          message: 'Auto-assignment failed. No suitable technician found. Please manually select a technician.',
          autoAssignFailed: true,
          suggestion: 'No technician available in the area or time slot. Please check technician availability and select manually.'
        }, { status: 201 });
      }
    }

    return NextResponse.json(job, { status: 201 });
  } catch (e) {
    console.error('Error creating job:', e);
    return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
  }
}
