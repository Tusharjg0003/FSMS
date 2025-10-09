import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/lib/auth";

// Use singleton Prisma client to avoid connection issues
declare global {
  var prisma: PrismaClient | undefined;
}

const prisma = globalThis.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

export async function GET(request: NextRequest) {
  let userId: string | null = null;
  let startTime: string | null = null;
  let endTime: string | null = null;
  
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    userId = searchParams.get('userId');
    startTime = searchParams.get('startTime');
    endTime = searchParams.get('endTime');

    if (!userId || !startTime || !endTime) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Validate userId is a number
    const userIdNum = parseInt(userId);
    if (isNaN(userIdNum)) {
      return NextResponse.json({ error: 'Invalid userId parameter' }, { status: 400 });
    }

    // Check if technician has availability during the specified time
    // An availability window covers the job time if:
    // - window starts before or at job start time AND
    // - window ends after or at job end time
    const jobStartTime = new Date(startTime);
    const jobEndTime = new Date(endTime);
    
    // Validate dates
    if (isNaN(jobStartTime.getTime()) || isNaN(jobEndTime.getTime())) {
      return NextResponse.json({ error: 'Invalid date parameters' }, { status: 400 });
    }

    console.log(`Checking availability for user ${userIdNum}: ${jobStartTime.toISOString()} to ${jobEndTime.toISOString()}`);
    
    // First, check if the user exists and has availability windows
    const userExists = await prisma.user.findUnique({
      where: { id: userIdNum },
      select: { id: true, name: true }
    });

    if (!userExists) {
      console.log(`User ${userIdNum} not found`);
      return NextResponse.json({ 
        hasAvailability: false,
        reason: 'User not found',
        availabilityWindows: []
      });
    }

    // Check total availability windows for this user
    const totalWindows = await prisma.technicianAvailabilityWindow.count({
      where: { userId: userIdNum }
    });

    console.log(`User ${userIdNum} has ${totalWindows} availability windows`);

    const availabilityWindows = await prisma.technicianAvailabilityWindow.findMany({
      where: {
        userId: userIdNum,
        startUtc: { lte: jobStartTime }, // Window starts before or at job start
        endUtc: { gte: jobEndTime }      // Window ends after or at job end
      }
    });

    const hasAvailability = availabilityWindows.length > 0;
    
    console.log(`Found ${availabilityWindows.length} matching availability windows`);

    return NextResponse.json({
      hasAvailability,
      availabilityWindows: availabilityWindows.map(window => ({
        startUtc: window.startUtc,
        endUtc: window.endUtc
      })),
      debug: {
        userId: userIdNum,
        jobStartTime: jobStartTime.toISOString(),
        jobEndTime: jobEndTime.toISOString(),
        totalWindows,
        matchingWindows: availabilityWindows.length
      }
    });

  } catch (error) {
    console.error('Error checking availability:', error);
    console.error('Error details:', {
      userId,
      startTime,
      endTime,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json({ 
      error: 'Failed to check availability',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
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
  }
}