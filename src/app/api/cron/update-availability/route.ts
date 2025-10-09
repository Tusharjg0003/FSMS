import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/lib/auth";

const prisma = new PrismaClient();

// This endpoint will be called daily to update availability windows
export async function POST(request: NextRequest) {
  try {
    // Optional: Add authentication/API key check for security
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Starting daily availability window update...');

    // Get all technicians
    const technicians = await prisma.user.findMany({
      where: { role: { name: 'TECHNICIAN' } },
      select: { id: true, name: true }
    });

    if (technicians.length === 0) {
      return NextResponse.json({ message: 'No technicians found' });
    }

    const today = new Date();
    
    // Calculate the new date (21 days from today)
    const newDate = new Date(today);
    newDate.setDate(today.getDate() + 20); // 21st day (0-indexed)
    
    // Get date components for UTC calculation
    const year = newDate.getFullYear();
    const month = newDate.getMonth();
    const day = newDate.getDate();
    
    // Create availability windows for the new day (8 AM - 8 PM Malaysian Time)
    // Convert Malaysia time (UTC+8) to actual UTC
    // 8 AM Malaysia = midnight UTC, 8 PM Malaysia = noon UTC
    const startUTC = new Date(Date.UTC(year, month, day, 0, 0, 0)); // midnight UTC = 8 AM Malaysia
    const endUTC = new Date(Date.UTC(year, month, day, 12, 0, 0));   // noon UTC = 8 PM Malaysia
    
    // Create new windows for all technicians
    const newWindows = technicians.map(tech => ({
      userId: tech.id,
      startUtc: startUTC, // Now storing actual UTC time
      endUtc: endUTC      // Now storing actual UTC time
    }));
    
    // Calculate the date to remove (oldest day)
    const removeDate = new Date(today);
    removeDate.setDate(today.getDate() - 1); // Yesterday was the oldest day
    
    const removeYear = removeDate.getFullYear();
    const removeMonth = removeDate.getMonth();
    const removeDay = removeDate.getDate();
    
    const removeStartUTC = new Date(removeYear, removeMonth, removeDay, 0, 0, 0);
    const removeEndUTC = new Date(removeYear, removeMonth, removeDay, 12, 0, 0);
    
    // Remove old windows and add new ones in a transaction
    await prisma.$transaction(async (tx) => {
      // Remove windows for the oldest day
      await tx.technicianAvailabilityWindow.deleteMany({
        where: {
          startUtc: removeStartUTC,
          endUtc: removeEndUTC
        }
      });
      
      // Add new windows for the new day
      await tx.technicianAvailabilityWindow.createMany({
        data: newWindows
      });
    });

    console.log(`Updated availability windows for ${technicians.length} technicians`);
    console.log(`Added new day: ${newDate.toDateString()}`);
    console.log(`Removed old day: ${removeDate.toDateString()}`);

    return NextResponse.json({
      success: true,
      message: `Rolled availability windows for ${technicians.length} technicians`,
      details: {
        technicians: technicians.length,
        newDay: newDate.toDateString(),
        removedDay: removeDate.toDateString(),
        schedule: '8 AM - 8 PM Malaysian Time',
        action: 'Rolled forward by 1 day'
      }
    });

  } catch (error) {
    console.error('Error updating availability windows:', error);
    return NextResponse.json({ error: 'Failed to update availability windows' }, { status: 500 });
  }
}

// GET endpoint for manual testing
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Same logic as POST but without auth check
  try {
    const technicians = await prisma.user.findMany({
      where: { role: { name: 'TECHNICIAN' } },
      select: { id: true, name: true }
    });

    const today = new Date();
    
    // Calculate the new date (21 days from today)
    const newDate = new Date(today);
    newDate.setDate(today.getDate() + 20); // 21st day (0-indexed)
    
    // Get date components for UTC calculation
    const year = newDate.getFullYear();
    const month = newDate.getMonth();
    const day = newDate.getDate();
    
    // Create availability windows for the new day (8 AM - 8 PM Malaysian Time)
    // Convert Malaysia time (UTC+8) to actual UTC
    // 8 AM Malaysia = midnight UTC, 8 PM Malaysia = noon UTC
    const startUTC = new Date(Date.UTC(year, month, day, 0, 0, 0)); // midnight UTC = 8 AM Malaysia
    const endUTC = new Date(Date.UTC(year, month, day, 12, 0, 0));   // noon UTC = 8 PM Malaysia
    
    // Create new windows for all technicians
    const newWindows = technicians.map(tech => ({
      userId: tech.id,
      startUtc: startUTC, // Now storing actual UTC time
      endUtc: endUTC      // Now storing actual UTC time
    }));
    
    // Calculate the date to remove (oldest day)
    const removeDate = new Date(today);
    removeDate.setDate(today.getDate() - 1); // Yesterday was the oldest day
    
    const removeYear = removeDate.getFullYear();
    const removeMonth = removeDate.getMonth();
    const removeDay = removeDate.getDate();
    
    const removeStartUTC = new Date(removeYear, removeMonth, removeDay, 0, 0, 0);
    const removeEndUTC = new Date(removeYear, removeMonth, removeDay, 12, 0, 0);
    
    // Remove old windows and add new ones in a transaction
    await prisma.$transaction(async (tx) => {
      // Remove windows for the oldest day
      await tx.technicianAvailabilityWindow.deleteMany({
        where: {
          startUtc: removeStartUTC,
          endUtc: removeEndUTC
        }
      });
      
      // Add new windows for the new day
      await tx.technicianAvailabilityWindow.createMany({
        data: newWindows
      });
    });

    return NextResponse.json({
      success: true,
      message: `Manually rolled availability windows for ${technicians.length} technicians`,
      details: {
        technicians: technicians.length,
        newDay: newDate.toDateString(),
        removedDay: removeDate.toDateString(),
        schedule: '8 AM - 8 PM Malaysian Time',
        action: 'Rolled forward by 1 day'
      }
    });

  } catch (error) {
    console.error('Error updating availability windows:', error);
    return NextResponse.json({ error: 'Failed to update availability windows' }, { status: 500 });
  }
}
