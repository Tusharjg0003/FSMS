import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/lib/auth";

const prisma = new PrismaClient();

// GET - Fetch users based on role filter
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
    const role = searchParams.get('role');

    let whereClause: any = {};
    
    // Filter by role if provided
    if (role) {
      whereClause.role = {
        name: role
      };
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        isAvailable: true,
        role: {
          select: {
            name: true,
          },
        },
        // Include technician location preferences for admin users
        preferredWorkingLocation: true,
        preferredLatitude: true,
        preferredLongitude: true,
        preferredRadiusKm: true,
        isAvailable: true,
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
} 