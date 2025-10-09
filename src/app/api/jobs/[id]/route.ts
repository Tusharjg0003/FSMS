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
import { authOptions } from "@/lib/auth";

const prisma = new PrismaClient();

function isOngoingStatus(status: string) {
  const s = status.toLowerCase();
  return s === 'pending' || s === 'in progress';
}

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

    // Convert Malaysia time to UTC before storing
    const newStart = startTime ? (() => {
      const malaysiaTime = new Date(startTime);
      return new Date(malaysiaTime.getTime() - (8 * 60 * 60 * 1000)); // Convert to UTC
    })() : existing.startTime;
    const newEnd = endTime !== undefined ? (endTime ? (() => {
      const malaysiaTime = new Date(endTime);
      return new Date(malaysiaTime.getTime() - (8 * 60 * 60 * 1000)); // Convert to UTC
    })() : null) : existing.endTime;
    const newTechId =
      technicianId !== undefined ? (technicianId ? Number(technicianId) : null) : existing.technicianId;

    if (newEnd && newEnd <= newStart) {
      return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 });
    }

    if (newTechId) {
      //check if tech is available (on-job)
      
      //check for scheduling conflicts
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

// delete job and all associated data
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const jobId = Number(params.id);
  if (Number.isNaN(jobId)) {
    return NextResponse.json({ error: 'Invalid job id' }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1) Get job with technician
      const job = await tx.job.findUnique({
        where: { id: jobId },
        select: { id: true, technicianId: true }
      });
      if (!job) {
        return { ok: false, reason: 'Job not found' };
      }

      const techId = job.technicianId ?? null;

      // 2) Delete the job (hard-delete job record)
      await tx.job.delete({ where: { id: jobId } });

      // 3) If there is a technician, check ongoing jobs
      if (techId) {
        const now = new Date();

        const ongoingCount = await tx.job.count({
          where: {
            technicianId: techId,
            OR: [
              { status: { in: ['pending', 'in progress'] } },
              {
                startTime: { gt: now },
                status: { notIn: ['cancelled', 'completed'] }
              }
            ]
          }
        });

        // 4) If no ongoing jobs remain, soft-delete the technician
        if (ongoingCount === 0) {
          await tx.user.update({
            where: { id: techId },
            data: {
              isActive: false,
              deletedAt: new Date()
            }
          });
          return { ok: true, technicianSoftDeleted: true };
        }
      }

      return { ok: true, technicianSoftDeleted: false };
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.reason || 'Failed to delete' }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      technicianSoftDeleted: result.technicianSoftDeleted
    });
  } catch (e) {
    console.error('DELETE /api/jobs/[id] error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}