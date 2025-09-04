// import { NextRequest, NextResponse } from 'next/server';
// import { PrismaClient } from '@prisma/client';

// const prisma = new PrismaClient();

// export async function GET(
//   request: NextRequest,
//   { params }: { params: { id: string } }
// ) {
//   try {
//     if (!params.id || isNaN(Number(params.id))) {
//       return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
//     }
//     const job = await prisma.job.findUnique({
//       where: { id: Number(params.id) },
//       include: {
//         jobType: true,
//         technician: {
//           select: {
//             id: true,
//             name: true,
//             email: true,
//           },
//         },
//         reports: {
//           include: {
//             user: { select: { id: true, name: true, email: true } },
//           },
//           orderBy: { submissionDate: 'desc' },
//         },
//       },
//     });
//     if (!job) {
//       return NextResponse.json({ error: 'Job not found' }, { status: 404 });
//     }
//     return NextResponse.json(job);
//   } catch (error) {
//     console.error('Error fetching job:', error);
//     return NextResponse.json({ error: 'Failed to fetch job' }, { status: 500 });
//   }
// } 


// /api/jobs/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id || isNaN(Number(id))) {
      return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
    }
    
    const job = await prisma.job.findUnique({
      where: { id: Number(id) },
      include: {
        jobType: true,
        technician: {
          select: { id: true, name: true, email: true }
        },
        reports: {
          include: {
            user: { select: { name: true, email: true } }
          },
          orderBy: { submissionDate: 'desc' }
        }
      }
    });
    
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    
    return NextResponse.json(job);
  } catch (error) {
    console.error('Error fetching job:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function overlap(aStart: Date, aEnd: Date | null, bStart: Date, bEnd: Date | null) {
  const endA = aEnd ?? new Date(aStart.getTime() + 30 * 60 * 1000);
  const endB = bEnd ?? new Date(bStart.getTime() + 30 * 60 * 1000);
  return aStart < endB && bStart < endA;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'SUPERVISOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!id || isNaN(Number(id))) {
      return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
    }

    const body = await request.json();
    const { startTime, endTime, technicianId, status, location } = body;

    const existing = await prisma.job.findUnique({ where: { id: Number(id) } });
    if (!existing) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    const newStart = startTime ? new Date(startTime) : existing.startTime;
    const newEnd = endTime !== undefined ? (endTime ? new Date(endTime) : null) : existing.endTime;
    const newTechId =
      technicianId !== undefined ? (technicianId ? Number(technicianId) : null) : existing.technicianId;

    if (newEnd && newEnd <= newStart) {
      return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 });
    }

    if (newTechId) {
      const overlaps = await prisma.job.findMany({
        where: {
          id: { not: existing.id },
          technicianId: newTechId,
          status: { notIn: ['cancelled', 'completed'] },
          startTime: { lt: newEnd ?? new Date(newStart.getTime() + 24 * 60 * 60 * 1000) },
          OR: [{ endTime: null }, { endTime: { gt: newStart } }],
        },
        select: { id: true, startTime: true, endTime: true, status: true },
      });

      const conflicting = overlaps.filter((j) => overlap(newStart, newEnd, j.startTime, j.endTime));
      if (conflicting.length) {
        return NextResponse.json({ error: 'Scheduling conflict', conflicts: conflicting }, { status: 409 });
      }
    }

    const updated = await prisma.job.update({
      where: { id: existing.id },
      data: {
        startTime: newStart,
        endTime: newEnd,
        technicianId: newTechId,
        status: status ?? existing.status,
        location: location ?? existing.location,
      },
    });

    if (status && status !== existing.status) {
      await prisma.jobStatusHistory.create({
        data: {
          jobId: existing.id,
          previousStatus: existing.status,
          currentStatus: status,
          userId: Number(session.user.id),
        },
      });
    }

    return NextResponse.json(updated);
  } catch (e) {
    console.error('Error updating job:', e);
    return NextResponse.json({ error: 'Failed to update job' }, { status: 500 });
  }
}
