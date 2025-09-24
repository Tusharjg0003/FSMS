// import { NextRequest, NextResponse } from 'next/server';
// import { PrismaClient } from '@prisma/client';
// import { getServerSession } from 'next-auth';
// import { authOptions } from '../auth/[...nextauth]/route';

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
import { authOptions } from '../auth/[...nextauth]/route';

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
    const { jobTypeId, status, startTime, endTime, location, technicianId } = body;

    if (!jobTypeId || !status || !startTime || !location) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : null;
    if (end && end <= start) {
      return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const autoAssign = searchParams.get('autoAssign') === 'true';

    // Choose technician (either provided or auto-assigned)
    let assignedTechId: number | null = technicianId ? parseInt(technicianId) : null;

    if (!assignedTechId && autoAssign) {
      // 1) Pull all technicians
      const techs = await prisma.user.findMany({
        where: { role: { name: 'TECHNICIAN' }, isAvailable: true },
        select: { id: true, name: true },
      });

      // 2) For each tech, check overlap and compute workload for THAT DAY
      const dayStart = new Date(start);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(start);
      dayEnd.setHours(23, 59, 59, 999);

      const candidates = await Promise.all(
        techs.map(async (t) => {
          // all jobs that could overlap our new job time window
          const potential = await prisma.job.findMany({
            where: {
              technicianId: t.id,
              status: { notIn: ['cancelled', 'completed'] },
              startTime: { lt: end ?? new Date(start.getTime() + 24 * 60 * 60 * 1000) },
              OR: [{ endTime: null }, { endTime: { gt: start } }],
            },
            select: { id: true, startTime: true, endTime: true },
          });

          const conflict = potential.some((j) => hasOverlap(start, end, j.startTime, j.endTime));

          // workload = active jobs the same day
          const load = await prisma.job.count({
            where: {
              technicianId: t.id,
              status: { notIn: ['cancelled', 'completed'] },
              startTime: { gte: dayStart, lte: dayEnd },
            },
          });

          return { techId: t.id, conflict, load };
        })
      );

      // 3) Pick least-loaded among conflict-free candidates
      const free = candidates.filter((c) => !c.conflict);
      if (free.length > 0) {
        free.sort((a, b) => a.load - b.load);
        assignedTechId = free[0].techId;
      } else {
        // No one is available — surface the conflicts (409) so UI can show them
        // Build a quick conflict list for the closest (lowest load) tech to help the user
        candidates.sort((a, b) => a.load - b.load);
        const fallbackTech = candidates[0];

        const overlaps = await prisma.job.findMany({
          where: {
            technicianId: fallbackTech?.techId ?? undefined,
            status: { notIn: ['cancelled', 'completed'] },
            startTime: { lt: end ?? new Date(start.getTime() + 24 * 60 * 60 * 1000) },
            OR: [{ endTime: null }, { endTime: { gt: start } }],
          },
          include: { jobType: true },
        });

        const conflicting = overlaps.filter((j) => hasOverlap(start, end, j.startTime, j.endTime));

        return NextResponse.json(
          {
            error: 'Scheduling conflict: no available technician for the selected time.',
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

    // If a technician is provided (or chosen), ensure available and do a final overlap check
    if (assignedTechId) {
      const tech = await prisma.user.findUnique({
        where: { id: assignedTechId },
        select: { id: true, isAvailable: true, role: { select: { name: true } } },
      });
      if (!tech || tech.role?.name !== 'TECHNICIAN') {
        return NextResponse.json({ error: 'Technician not found' }, { status: 404 });
      }
      if (!tech.isAvailable) {
        return NextResponse.json({ error: 'Technician is unavailable' }, { status: 409 });
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

    // Create the job
    const job = await prisma.job.create({
      data: {
        jobTypeId: parseInt(jobTypeId),
        status,
        startTime: start,
        endTime: end,
        location,
        technicianId: assignedTechId,
      },
      include: {
        jobType: true,
        technician: { select: { id: true, name: true, email: true } },
      },
    });

    // Track initial status history
    await prisma.jobStatusHistory.create({
      data: {
        jobId: job.id,
        previousStatus: 'created',
        currentStatus: status,
        userId: Number(session.user.id),
      },
    });

    return NextResponse.json(job, { status: 201 });
  } catch (e) {
    console.error('Error creating job:', e);
    return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
  }
}
