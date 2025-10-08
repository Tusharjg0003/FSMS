import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { geocodeAddress, validateMalaysiaCoordinates } from '../../../lib/geocoding';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { 
      name, 
      email, 
      password, 
      roleId,
      // Technician-specific fields
      preferredWorkingLocation,
      preferredLatitude,
      preferredLongitude,
      preferredRadiusKm
    } = await request.json();
    
    if (!name || !email || !password || !roleId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }
    
    // Get role information to check if it's a technician
    const role = await prisma.role.findUnique({ where: { id: Number(roleId) } });
    const isTechnician = role?.name === 'TECHNICIAN';
    
    // Handle geocoding for technicians
    let finalLatitude = preferredLatitude;
    let finalLongitude = preferredLongitude;
    
    if (isTechnician && preferredWorkingLocation) {
      console.log('Auto-geocoding preferred location:', preferredWorkingLocation);
      const geocodeResult = await geocodeAddress(preferredWorkingLocation);
      
      if (!('error' in geocodeResult)) {
        const { latitude, longitude } = geocodeResult.coordinates;
        
        if (validateMalaysiaCoordinates(latitude, longitude)) {
          finalLatitude = latitude;
          finalLongitude = longitude;
          console.log('Auto-geocoded', preferredWorkingLocation, 'to', `(${latitude}, ${longitude})`);
        } else {
          console.log('Geocoded coordinates are outside Malaysia, using provided coordinates');
        }
      } else {
        console.log('Geocoding failed, using provided coordinates:', geocodeResult.error);
      }
    }
    
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        roleId: Number(roleId),
        // Technician-specific fields
        ...(isTechnician && {
          preferredWorkingLocation: preferredWorkingLocation || null,
          preferredLatitude: finalLatitude,
          preferredLongitude: finalLongitude,
          preferredRadiusKm: preferredRadiusKm || 10.0,
          isAvailable: true
        })
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: { select: { name: true } },
      },
    });
    
    // Create availability windows for technicians
    if (isTechnician) {
      console.log('Creating availability windows for new technician:', user.name);
      
      const today = new Date();
      const windows = [];
      
      // Create 21 days of availability (8 AM - 8 PM Malaysian Time)
      for (let i = 0; i < 21; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        
        // Store Malaysia time directly (8 AM - 8 PM)
        const startMalaysia = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 8, 0, 0);
        const endMalaysia = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 20, 0, 0);
        
        windows.push({
          userId: user.id,
          startUtc: startMalaysia, // Actually storing Malaysia time
          endUtc: endMalaysia      // Actually storing Malaysia time
        });
      }
      
      await prisma.technicianAvailabilityWindow.createMany({
        data: windows
      });
      
      console.log(`Created ${windows.length} availability windows for technician ${user.name}`);
    }
    
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
} 



// app/api/users/route.ts (example)
export async function GET() {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      email: true,
      role: { select: { name: true } },
    },
    orderBy: { id: 'asc' },
  });
  return NextResponse.json(users);
}
