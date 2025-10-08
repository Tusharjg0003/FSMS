import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';

const prisma = new PrismaClient();

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  try {
    const session = await getServerSession(authOptions);
    console.log('Report submission - Session:', session ? 'Found' : 'Not found');
    
    if (!session) {
      console.log('Report submission - No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('Report submission - User:', session.user.id, 'Role:', session.user.role);
    
    const job = await prisma.job.findUnique({ where: { id: Number(id) } });
    if (!job) {
      console.log('Report submission - Job not found:', id);
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    
    console.log('Report submission - Job found:', job.id, 'Technician:', job.technicianId);
    
    // Only allow assigned technician or admin
    if (
      (session.user as any).role !== 'ADMIN' &&
      (!job.technicianId || Number(session.user.id) !== job.technicianId)
    ) {
      console.log('Report submission - Forbidden: User not assigned to job');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const { notes, images, signature } = await request.json();
    console.log('Report submission - Data received:', { 
      hasNotes: !!notes, 
      notesLength: notes?.length, 
      imagesCount: images?.length || 0, 
      hasSignature: !!signature 
    });
    
    if (!notes) {
      console.log('Report submission - No notes provided');
      return NextResponse.json({ error: 'Notes are required' }, { status: 400 });
    }
    
    const report = await prisma.technicianReport.create({
      data: {
        userId: Number(session.user.id),
        jobId: Number(id),
        notes,
        images: images ? JSON.stringify(images) : JSON.stringify([]),
        signature: signature || null,
      },
    });
    
    console.log('Report submission - Success:', report.id);
    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    console.error('Error submitting report:', error);
    return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 });
  }
} 