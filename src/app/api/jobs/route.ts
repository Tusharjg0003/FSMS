import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

const prisma = new PrismaClient();

// GET - Fetch jobs based on user role
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const technicianId = searchParams.get('technicianId');

    let whereClause: any = {};
    
    // Filter by status if provided
    if (status) {
      whereClause.status = status;
    }

    // Filter by technician if user is a technician
    if (session.user.role === 'TECHNICIAN') {
      whereClause.technicianId = Number(session.user.id);
    }

    // Filter by specific technician if provided (for supervisors/admins)
    if (technicianId && ['ADMIN', 'SUPERVISOR'].includes(session.user.role)) {
      whereClause.technicianId = parseInt(technicianId);
    }

    const jobs = await prisma.job.findMany({
      where: whereClause,
      include: {
        jobType: true,
        technician: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { startTime: 'desc' },
    });

    return NextResponse.json(jobs);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}

// POST - Create a new job
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { jobTypeId, status, startTime, endTime, location, technicianId } = body;

    if (!jobTypeId || !status || !startTime || !location) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const job = await prisma.job.create({
      data: {
        jobTypeId: parseInt(jobTypeId),
        status,
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : null,
        location,
        technicianId: technicianId ? parseInt(technicianId) : null,
      },
      include: {
        jobType: true,
        technician: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    console.error('Error creating job:', error);
    return NextResponse.json(
      { error: 'Failed to create job' },
      { status: 500 }
    );
  }
} 