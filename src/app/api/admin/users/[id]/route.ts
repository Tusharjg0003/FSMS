import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { geocodeAddress, validateMalaysiaCoordinates } from '@/lib/geocoding';

const prisma = new PrismaClient();

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id: Number(id) },
      select: {
        id: true,
        name: true,
        email: true,
        roleId: true,
        role: { select: { name: true } },
        // Technician location preferences
        preferredWorkingLocation: true,
        preferredLatitude: true,
        preferredLongitude: true,
        preferredRadiusKm: true,
        timezone: true,
        isAvailable: true,
      },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id } = await params;
    const { name, email, password, roleId, preferredWorkingLocation, preferredLatitude, preferredLongitude, preferredRadiusKm, timezone, isAvailable } = await request.json();
    
    if (!name || !email || !roleId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Auto-geocode preferred working location if provided and coordinates not given
    let finalLatitude = preferredLatitude;
    let finalLongitude = preferredLongitude;
    
    if (preferredWorkingLocation) {
      try {
        console.log(`🔍 Auto-geocoding preferred location: ${preferredWorkingLocation}`);
        const geocodeResult = await geocodeAddress(preferredWorkingLocation);
        
        // Check if geocoding was successful (no 'error' property means success)
        if (!('error' in geocodeResult)) {
          const { latitude, longitude } = geocodeResult;
          
          // Validate coordinates are in Malaysia
          if (validateMalaysiaCoordinates(latitude, longitude)) {
            finalLatitude = latitude;
            finalLongitude = longitude;
            console.log(`✅ Auto-geocoded ${preferredWorkingLocation} to (${latitude}, ${longitude})`);
          } else {
            console.log(`❌ Geocoded coordinates (${latitude}, ${longitude}) are outside Malaysia`);
          }
        } else {
          console.log(`❌ Failed to geocode ${preferredWorkingLocation}: ${geocodeResult.message}`);
        }
      } catch (error) {
        console.error(`❌ Error geocoding ${preferredWorkingLocation}:`, error);
      }
    }
    
    const updateData: any = { name, email, roleId: Number(roleId) };
    if (password) {
      updateData.password = await bcrypt.hash(password, 12);
    }
    
    // Add technician preferences if provided
    if (preferredWorkingLocation !== undefined) updateData.preferredWorkingLocation = preferredWorkingLocation;
    if (finalLatitude !== undefined) updateData.preferredLatitude = finalLatitude;
    if (finalLongitude !== undefined) updateData.preferredLongitude = finalLongitude;
    if (preferredRadiusKm !== undefined) updateData.preferredRadiusKm = preferredRadiusKm;
    if (timezone !== undefined) updateData.timezone = timezone;
    if (isAvailable !== undefined) updateData.isAvailable = isAvailable;
    
    const user = await prisma.user.update({
      where: { id: Number(id) },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: { select: { name: true } },
      },
    });
    return NextResponse.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    
    // Check if user exists and get their role
    const user = await prisma.user.findUnique({
      where: { id: Number(id) },
      select: { 
        id: true, 
        name: true, 
        role: { select: { name: true } },
        jobs: { select: { id: true } }
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If deleting a technician, handle related data cleanup
    if (user.role?.name === 'TECHNICIAN') {
      // Check if technician has assigned jobs
      const assignedJobs = await prisma.job.findMany({
        where: { technicianId: Number(id) },
        select: { id: true, status: true }
      });

      if (assignedJobs.length > 0) {
        const activeJobs = assignedJobs.filter(job => job.status !== 'COMPLETED');
        if (activeJobs.length > 0) {
          return NextResponse.json({ 
            error: `Cannot delete technician. They have ${activeJobs.length} active job(s) assigned. Please reassign or complete these jobs first.` 
          }, { status: 400 });
        }
      }

      // Delete technician availability windows
      await prisma.technicianAvailabilityWindow.deleteMany({
        where: { userId: Number(id) }
      });

      // Unassign completed jobs (set technicianId to null)
      await prisma.job.updateMany({
        where: { technicianId: Number(id) },
        data: { technicianId: null }
      });
    }

    // Delete the user
    await prisma.user.delete({ where: { id: Number(id) } });
    
    return NextResponse.json({ 
      message: `User ${user.name} deleted successfully`,
      deletedUser: {
        id: user.id,
        name: user.name,
        role: user.role?.name
      }
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
} 