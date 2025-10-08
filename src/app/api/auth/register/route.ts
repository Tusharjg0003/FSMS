import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { geocodeAddress, validateMalaysiaCoordinates } from '@/lib/geocoding';

const prisma = new PrismaClient();

const availabilityWindowSchema = z.object({
  startUtc: z.string().datetime(),
  endUtc: z.string().datetime(),
});

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['ADMIN', 'SUPERVISOR', 'TECHNICIAN']),
  preferredWorkingLocation: z.string().optional(),
  preferredLatitude: z.number().optional(),
  preferredLongitude: z.number().optional(),
  preferredRadiusKm: z.number().optional(),
  timezone: z.string().optional(),
  availabilityWindows: z.array(availabilityWindowSchema).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, role, preferredWorkingLocation, preferredLatitude, preferredLongitude, preferredRadiusKm, timezone, availabilityWindows } = registerSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Get or create role
    let userRole = await prisma.role.findUnique({
      where: { name: role },
    });

    if (!userRole) {
      userRole = await prisma.role.create({
        data: { name: role },
      });
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

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        roleId: userRole.id,
        preferredWorkingLocation,
        preferredLatitude: finalLatitude ?? null,
        preferredLongitude: finalLongitude ?? null,
        preferredRadiusKm: preferredRadiusKm ?? 10,
        timezone: timezone ?? null,
      },
      include: {
        role: true,
      },
    });

    // Auto-create availability windows for technicians (3 weeks ahead, 8 AM - 8 PM Malaysian Time)
    if (role === 'TECHNICIAN') {
      const today = new Date();
      const windows = [];
      
      // Create 21 days of availability (3 weeks)
      for (let i = 0; i < 21; i++) {
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + i);
        
        // Get the date components for UTC calculation
        const year = targetDate.getFullYear();
        const month = targetDate.getMonth();
        const day = targetDate.getDate();
        
        // Store Malaysia time directly (8 AM - 8 PM Malaysia Time)
        const startMalaysia = new Date(year, month, day, 8, 0, 0); // 8 AM Malaysia time
        const endMalaysia = new Date(year, month, day, 20, 0, 0); // 8 PM Malaysia time
        
        windows.push({
          userId: user.id,
          startUtc: startMalaysia, // Actually storing Malaysia time
          endUtc: endMalaysia      // Actually storing Malaysia time
        });
      }
      
      await prisma.technicianAvailabilityWindow.createMany({
        data: windows
      });
      
      console.log(`✅ Created 21 availability windows for technician ${user.name}`);
    }
    
    // Also persist custom availability windows if provided
    if (role === 'TECHNICIAN' && availabilityWindows && availabilityWindows.length > 0) {
      const valid = availabilityWindows.filter(w => new Date(w.endUtc) > new Date(w.startUtc));
      if (valid.length) {
        await prisma.technicianAvailabilityWindow.createMany({
          data: valid.map(w => ({ userId: user.id, startUtc: new Date(w.startUtc), endUtc: new Date(w.endUtc) })),
        });
      }
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json(
      { 
        message: 'User created successfully',
        user: userWithoutPassword 
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 