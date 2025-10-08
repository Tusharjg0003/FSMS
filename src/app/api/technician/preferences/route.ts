import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { geocodeAddress, validateMalaysiaCoordinates } from '@/lib/geocoding';

const prisma = new PrismaClient();

// GET - Get technician's own preferences
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'TECHNICIAN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const technician = await prisma.user.findUnique({
      where: { id: Number(session.user.id) },
      select: {
        id: true,
        name: true,
        email: true,
        preferredWorkingLocation: true,
        preferredLatitude: true,
        preferredLongitude: true,
        preferredRadiusKm: true,
        timezone: true,
        isAvailable: true,
      },
    });

    if (!technician) {
      return NextResponse.json({ error: 'Technician not found' }, { status: 404 });
    }

    return NextResponse.json(technician);
  } catch (error) {
    console.error('Error fetching technician preferences:', error);
    return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
  }
}

// PATCH - Update technician's own preferences
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'TECHNICIAN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      preferredWorkingLocation, 
      preferredLatitude, 
      preferredLongitude, 
      preferredRadiusKm, 
      timezone, 
      isAvailable 
    } = await request.json();

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

    const updateData: any = {};
    
    if (preferredWorkingLocation !== undefined) updateData.preferredWorkingLocation = preferredWorkingLocation;
    if (finalLatitude !== undefined) updateData.preferredLatitude = finalLatitude;
    if (finalLongitude !== undefined) updateData.preferredLongitude = finalLongitude;
    if (preferredRadiusKm !== undefined) updateData.preferredRadiusKm = preferredRadiusKm;
    if (timezone !== undefined) updateData.timezone = timezone;
    if (isAvailable !== undefined) updateData.isAvailable = isAvailable;

    const technician = await prisma.user.update({
      where: { id: Number(session.user.id) },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        preferredWorkingLocation: true,
        preferredLatitude: true,
        preferredLongitude: true,
        preferredRadiusKm: true,
        timezone: true,
        isAvailable: true,
      },
    });

    return NextResponse.json({
      message: 'Preferences updated successfully',
      technician
    });
  } catch (error) {
    console.error('Error updating technician preferences:', error);
    return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
  }
}
