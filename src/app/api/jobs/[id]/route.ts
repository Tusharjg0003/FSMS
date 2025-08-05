import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!params.id || isNaN(Number(params.id))) {
      return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
    }
    const job = await prisma.job.findUnique({
      where: { id: Number(params.id) },
      include: {
        jobType: true,
        technician: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        reports: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
          orderBy: { submissionDate: 'desc' },
        },
      },
    });
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    return NextResponse.json(job);
  } catch (error) {
    console.error('Error fetching job:', error);
    return NextResponse.json({ error: 'Failed to fetch job' }, { status: 500 });
  }
} 