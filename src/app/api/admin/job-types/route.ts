import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const allJobTypes = await prisma.jobType.findMany({
      orderBy: { name: 'asc' },
    });

    // Filter out deleted ones (for job creation form)
    const activeJobTypes = allJobTypes.filter(jt => !jt.deletedAt);

    return NextResponse.json(activeJobTypes);
  } catch (error) {
    console.error('Error fetching job types:', error);
    return NextResponse.json({ error: 'Failed to fetch job types' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { name, description } = await request.json();
    if (!name) {
      return NextResponse.json({ error: 'Job type name is required' }, { status: 400 });
    }
    const jobType = await prisma.jobType.create({
      data: { name, description: description || null },
    });
    return NextResponse.json(jobType, { status: 201 });
  } catch (error) {
    console.error('Error creating job type:', error);
    return NextResponse.json({ error: 'Failed to create job type' }, { status: 500 });
  }
} 