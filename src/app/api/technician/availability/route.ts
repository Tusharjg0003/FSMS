import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/lib/auth";

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
    // An availability window covers the job time if:
    // - window starts before or at job start time
    // - window ends after or at job end time
    const jobStartTime = new Date(startTime).getTime();
    const jobEndTime = new Date(endTime).getTime();
    
    const availabilityWindows = await prisma.technicianAvailabilityWindow.findMany({
      where: {
        userId: parseInt(userId),
        startUtc: { lte: jobStartTime },
        endUtc: { gte: jobEndTime }
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
    console.error('Error details:', {
      userId,
      startTime,
      endTime,
      errorMessage: error instanceof Error ? error.message : String(error)
    });
    return NextResponse.json({ 
      error: 'Failed to check availability',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { isAvailable } = body;

    if (typeof isAvailable !== 'boolean') {
      return NextResponse.json({ error: 'isAvailable must be a boolean' }, { status: 400 });
    }

    // Update user's availability status
    await prisma.user.update({
      where: { id: Number(session.user.id) },
      data: { isAvailable }
    });

    return NextResponse.json({ 
      success: true, 
      isAvailable,
      message: `Availability updated to ${isAvailable ? 'available' : 'unavailable'}`
    });

  } catch (error) {
    console.error('Error updating availability:', error);
    return NextResponse.json({ 
      error: 'Failed to update availability',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}