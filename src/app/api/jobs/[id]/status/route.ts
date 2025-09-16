import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';

const prisma = new PrismaClient();

export async function PATCH(request: NextRequest, context: { params: { id: string } }) {
  const params = await context.params;
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const job = await prisma.job.findUnique({ where: { id: Number(params.id) } });
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    // Only allow assigned technician or admin
    if (
      session.user.role !== 'ADMIN' &&
      (!job.technicianId || Number(session.user.id) !== job.technicianId)
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { status: newStatus } = await request.json();
    if (!newStatus) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    //consider the situation
    //No one can reopen completed jobs
    if (job.status.toLowerCase() === 'completed' && newStatus.toLowerCase() !== 'completed') {
      return NextResponse.json({ 
        error: 'Cannot change status of completed jobs' 
      }, { status: 400 });
    }

    const updatedJob = await prisma.job.update({
      where: { id: Number(params.id) },
      data: { status: newStatus },
    });
    return NextResponse.json(updatedJob);
  } catch (error) {
    console.error('Error updating job status:', error);
    return NextResponse.json({ error: 'Failed to update job status' }, { status: 500 });
  }
} 