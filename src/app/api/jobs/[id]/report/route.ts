import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';

const prisma = new PrismaClient();

export async function POST(request: NextRequest, context: { params: { id: string } }) {
  const { params } = context;
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
    const { notes, images, signature } = await request.json();
    if (!notes) {
      return NextResponse.json({ error: 'Notes are required' }, { status: 400 });
    }
    const report = await prisma.technicianReport.create({
      data: {
        userId: Number(session.user.id),
        jobId: Number(params.id),
        notes,
        images: images ? JSON.stringify(images) : JSON.stringify([]),
        signature: signature || null,
      },
    });
    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    console.error('Error submitting report:', error);
    return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 });
  }
} 