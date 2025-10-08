import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get('days');
    const days = Math.min(Math.max(Number(daysParam ?? 21), 1), 90); // 1-90 days max

    // Get all technicians
    const technicians = await prisma.user.findMany({
      where: { role: { name: 'TECHNICIAN' } },
      select: { id: true, name: true }
    });

    if (technicians.length === 0) {
      return NextResponse.json({ message: 'No technicians found' });
    }

    const today = new Date();
    const windows = [];

    // Create availability windows for specified days
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      const startUtc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 8, 0, 0));
      const endUtc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 20, 0, 0));
      
      for (const tech of technicians) {
        windows.push({
          userId: tech.id,
          startUtc,
          endUtc
        });
      }
    }

    // Clear existing windows and create new ones
    await prisma.technicianAvailabilityWindow.deleteMany({});
    await prisma.technicianAvailabilityWindow.createMany({
      data: windows
    });

    return NextResponse.json({
      message: `Extended availability windows for ${technicians.length} technicians`,
      details: {
        technicians: technicians.length,
        days: days,
        totalWindows: windows.length,
        schedule: '8 AM - 8 PM UTC',
        dateRange: `${today.toDateString()} to ${new Date(today.getTime() + (days - 1) * 24 * 60 * 60 * 1000).toDateString()}`
      }
    });

  } catch (error) {
    console.error('Error extending availability:', error);
    return NextResponse.json({ error: 'Failed to extend availability' }, { status: 500 });
  }
}
