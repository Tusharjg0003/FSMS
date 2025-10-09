import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/lib/auth";
import { geocodeAddress, validateMalaysiaCoordinates } from '@/lib/geocoding';

const prisma = new PrismaClient();

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN') {
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
        preferredWorkingLocation: true,
        preferredLatitude: true,
        preferredLongitude: true,
        preferredRadiusKm: true,
        timezone: true,
        isAvailable: true
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { 
      name, 
      email, 
      roleId, 
      password,
      preferredWorkingLocation,
      preferredLatitude,
      preferredLongitude,
      preferredRadiusKm,
      timezone,
      isAvailable
    } = body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: Number(id) },
      include: { role: true }
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {};
    
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (roleId !== undefined) updateData.roleId = Number(roleId);
    if (isAvailable !== undefined) updateData.isAvailable = isAvailable;
    if (timezone !== undefined) updateData.timezone = timezone;
    if (preferredRadiusKm !== undefined) updateData.preferredRadiusKm = Number(preferredRadiusKm);

    // Handle geocoding for preferred working location
    let finalLatitude = preferredLatitude;
    let finalLongitude = preferredLongitude;

    if (preferredWorkingLocation && preferredWorkingLocation !== existingUser.preferredWorkingLocation) {
      console.log('Geocoding preferred working location:', preferredWorkingLocation);
      
      try {
        const geocodeResult = await geocodeAddress(preferredWorkingLocation);
        
        if (!('error' in geocodeResult)) {
          const { latitude, longitude } = geocodeResult;
          
          if (validateMalaysiaCoordinates(latitude, longitude)) {
            finalLatitude = latitude;
            finalLongitude = longitude;
            console.log('Geocoding successful:', { latitude, longitude });
          } else {
            console.log('Geocoded coordinates are outside Malaysia bounds');
            return NextResponse.json({ 
              error: 'The preferred working location is outside Malaysia' 
            }, { status: 400 });
          }
        } else {
          console.log('Geocoding failed:', geocodeResult.error);
          return NextResponse.json({ 
            error: `Could not geocode the preferred working location: ${geocodeResult.error}` 
          }, { status: 400 });
        }
      } catch (error) {
        console.error('Geocoding error:', error);
        return NextResponse.json({ 
          error: 'Failed to geocode the preferred working location' 
        }, { status: 500 });
      }
    }

    // Update coordinates if they were geocoded or provided
    if (finalLatitude !== undefined) updateData.preferredLatitude = finalLatitude;
    if (finalLongitude !== undefined) updateData.preferredLongitude = finalLongitude;
    if (preferredWorkingLocation !== undefined) updateData.preferredWorkingLocation = preferredWorkingLocation;

    // Handle password update
    if (password && password.trim() !== '') {
      updateData.password = await bcrypt.hash(password, 10);
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: Number(id) },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        roleId: true,
        role: { select: { name: true } },
        preferredWorkingLocation: true,
        preferredLatitude: true,
        preferredLongitude: true,
        preferredRadiusKm: true,
        timezone: true,
        isAvailable: true
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check if user exists and get their role
    const user = await prisma.user.findUnique({
      where: { id: Number(id) },
      include: { 
        role: true,
        jobs: {
          where: {
            status: { notIn: ['cancelled', 'completed'] }
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If user is a technician, check for active jobs
    if (user.role?.name === 'TECHNICIAN') {
      if (user.jobs.length > 0) {
        return NextResponse.json({ 
          error: 'Cannot delete technician with active jobs. Please reassign or complete the jobs first.',
          counts: {
            active: user.jobs.length
          }
        }, { status: 409 });
      }

      // Delete technician availability windows
      await prisma.technicianAvailabilityWindow.deleteMany({
        where: { userId: Number(id) }
      });

      // For completed/cancelled jobs, preserve technician name and set technicianId to null
      await prisma.job.updateMany({
        where: { 
          technicianId: Number(id),
          status: { in: ['cancelled', 'completed'] }
        },
        data: { 
          technicianId: null,
          technicianName: user.name // Preserve technician name for history
        }
      });
    }

    // Delete the user
    await prisma.user.delete({
      where: { id: Number(id) }
    });

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
