import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const startTime = searchParams.get('startTime');
    const endTime = searchParams.get('endTime');

    if (!userId || !startTime || !endTime) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Check if technician has availability during the specified time
    const availabilityWindows = await prisma.technicianAvailabilityWindow.findMany({
      where: {
        userId: parseInt(userId),
        startUtc: { lte: new Date(startTime) },
        endUtc: { gte: new Date(endTime) }
      }
    });

    const hasAvailability = availabilityWindows.length > 0;

    return NextResponse.json({
      hasAvailability,
      availabilityWindows: availabilityWindows.map(window => ({
        startUtc: window.startUtc,
        endUtc: window.endUtc
      }))
    });

  } catch (error) {
    console.error('Error checking availability:', error);
    return NextResponse.json({ error: 'Failed to check availability' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}