import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

const prisma = new PrismaClient();

// Update technician's current location
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'TECHNICIAN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { latitude, longitude, accuracy, speed, heading, jobId } = await request.json();

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
    }

    // Update current location
    const updatedUser = await prisma.user.update({
      where: { id: Number(session.user.id) },
      data: {
        currentLatitude: latitude,
        currentLongitude: longitude,
        lastLocationUpdate: new Date(),
      },
    });

    // Add to location history
    await prisma.locationHistory.create({
      data: {
        userId: Number(session.user.id),
        latitude,
        longitude,
        accuracy: accuracy || null,
        speed: speed || null,
        heading: heading || null,
        jobId: jobId || null,
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Location updated successfully',
      currentLocation: {
        latitude: updatedUser.currentLatitude,
        longitude: updatedUser.currentLongitude,
        lastUpdate: updatedUser.lastLocationUpdate,
      }
    });
  } catch (error) {
    console.error('Error updating location:', error);
    return NextResponse.json({ error: 'Failed to update location' }, { status: 500 });
  }
}

// Get technician's current location and recent history
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'TECHNICIAN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const jobId = searchParams.get('jobId');

    // Get current location
    const user = await prisma.user.findUnique({
      where: { id: Number(session.user.id) },
      select: {
        currentLatitude: true,
        currentLongitude: true,
        lastLocationUpdate: true,
      },
    });

    // Get location history
    const whereClause: any = { userId: Number(session.user.id) };
    if (jobId) {
      whereClause.jobId = parseInt(jobId);
    }

    const locationHistory = await prisma.locationHistory.findMany({
      where: whereClause,
      orderBy: { timestamp: 'desc' },
      take: limit,
      include: {
        job: {
          select: {
            id: true,
            location: true,
            status: true,
          },
        },
      },
    });

    return NextResponse.json({
      currentLocation: {
        latitude: user?.currentLatitude,
        longitude: user?.currentLongitude,
        lastUpdate: user?.lastLocationUpdate,
      },
      locationHistory,
    });
  } catch (error) {
    console.error('Error fetching location:', error);
    return NextResponse.json({ error: 'Failed to fetch location' }, { status: 500 });
  }
}
