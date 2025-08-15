import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

const prisma = new PrismaClient();

// Get all technicians' current locations (admin/supervisor only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPERVISOR')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeHistory = searchParams.get('includeHistory') === 'true';
    const limit = parseInt(searchParams.get('limit') || '100');

    // Get all technicians with their current locations
    const technicians = await prisma.user.findMany({
      where: {
        role: {
          name: 'TECHNICIAN',
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        currentLatitude: true,
        currentLongitude: true,
        lastLocationUpdate: true,
        profilePicture: true,
        jobs: {
          where: {
            status: {
              in: ['ASSIGNED', 'IN_PROGRESS', 'ON_SITE'],
            },
          },
          select: {
            id: true,
            location: true,
            status: true,
            startTime: true,
            jobType: {
              select: {
                name: true,
              },
            },
          },
        },
        ...(includeHistory && {
          locationHistory: {
            orderBy: { timestamp: 'desc' },
            take: limit,
            select: {
              id: true,
              latitude: true,
              longitude: true,
              timestamp: true,
              accuracy: true,
              speed: true,
              heading: true,
              job: {
                select: {
                  id: true,
                  location: true,
                  status: true,
                },
              },
            },
          },
        }),
      },
    });

    // Filter out technicians without location data
    const techniciansWithLocation = technicians.filter(
      (tech) => tech.currentLatitude !== null && tech.currentLongitude !== null
    );

    return NextResponse.json({
      technicians: techniciansWithLocation,
      totalCount: techniciansWithLocation.length,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching technician locations:', error);
    return NextResponse.json({ error: 'Failed to fetch technician locations' }, { status: 500 });
  }
}
