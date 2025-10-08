import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/lib/auth";
import bcrypt from 'bcrypt';
import { geocodeAddress, validateMalaysiaCoordinates } from '@/lib/geocoding';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'TECHNICIAN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = await prisma.user.findUnique({
      where: { id: Number(session.user.id) },
      select: {
        id: true,
        name: true,
        email: true,
        profilePicture: true,
        nationality: true,
        dateOfBirth: true,
        preferredWorkingLocation: true,
      },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching technician profile:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'TECHNICIAN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { profilePicture, nationality, dateOfBirth, password, preferredWorkingLocation } = await request.json();
    
    // Auto-geocode preferred working location if provided
    let preferredLatitude = undefined;
    let preferredLongitude = undefined;
    
    if (preferredWorkingLocation) {
      try {
        console.log(`🔍 Auto-geocoding preferred location: ${preferredWorkingLocation}`);
        const geocodeResult = await geocodeAddress(preferredWorkingLocation);
        
        // Check if geocoding was successful (no 'error' property means success)
        if (!('error' in geocodeResult)) {
          const { latitude, longitude } = geocodeResult;
          
          // Validate coordinates are in Malaysia
          if (validateMalaysiaCoordinates(latitude, longitude)) {
            preferredLatitude = latitude;
            preferredLongitude = longitude;
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
    
    const updateData: any = {
      profilePicture,
      nationality,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      preferredWorkingLocation,
    };
    
    // Add coordinates if geocoding was successful
    if (preferredLatitude !== undefined) {
      updateData.preferredLatitude = preferredLatitude;
    }
    if (preferredLongitude !== undefined) {
      updateData.preferredLongitude = preferredLongitude;
    }
    
    if (password) {
      updateData.password = await bcrypt.hash(password, 12);
    }
    
    const user = await prisma.user.update({
      where: { id: Number(session.user.id) },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        profilePicture: true,
        nationality: true,
        dateOfBirth: true,
        preferredWorkingLocation: true,
        preferredLatitude: true,
        preferredLongitude: true,
      },
    });
    return NextResponse.json(user);
  } catch (error) {
    console.error('Error updating technician profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
} 