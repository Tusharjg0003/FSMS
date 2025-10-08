import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/lib/auth";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all job types
    const allJobTypes = await prisma.jobType.findMany({
      orderBy: { name: 'asc' },
    });
    
    // Filter to return ONLY deleted job types
    const deletedJobTypes = allJobTypes.filter(jt => jt.deletedAt !== null);
    
    return NextResponse.json(deletedJobTypes);
  } catch (error) {
    console.error('Error fetching deleted job types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job types' },
      { status: 500 }
    );
  }
}