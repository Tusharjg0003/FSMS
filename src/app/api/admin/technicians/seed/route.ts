import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Random centers around Klang Valley + some farther
const centers = [
  { name: 'Subang Jaya', lat: 3.0823, lng: 101.5850 },
  { name: 'Puchong', lat: 3.0204, lng: 101.6169 },
  { name: 'Shah Alam', lat: 3.0738, lng: 101.5183 },
  { name: 'Petaling Jaya', lat: 3.1073, lng: 101.6067 },
  { name: 'Kuala Lumpur', lat: 3.1390, lng: 101.6869 },
  { name: 'Putrajaya', lat: 2.9297, lng: 101.6778 },
  { name: 'Cyberjaya', lat: 2.9226, lng: 101.6500 },
];

function randRadius() {
  return 5 + Math.floor(Math.random() * 11); // 5-15 km
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const countParam = searchParams.get('count');
    const count = Math.min(Math.max(Number(countParam ?? 8), 1), 30);

    // Ensure roles exist
    let techRole = await prisma.role.findUnique({ where: { name: 'TECHNICIAN' as any } });
    if (!techRole) techRole = await prisma.role.create({ data: { name: 'TECHNICIAN' as any } });

    // Collect existing technician IDs
    const existingTechs = await prisma.user.findMany({
      where: { role: { name: 'TECHNICIAN' as any } },
      select: { id: true },
    });
    const techIds = existingTechs.map(t => t.id);

    // Null out job assignments referencing those technicians
    if (techIds.length) {
      await prisma.job.updateMany({ where: { technicianId: { in: techIds } }, data: { technicianId: null } });
      await prisma.technicianAvailabilityWindow.deleteMany({ where: { userId: { in: techIds } } });
      await prisma.locationHistory.deleteMany({ where: { userId: { in: techIds } } });
      await prisma.technicianReport.deleteMany({ where: { userId: { in: techIds } } });
      await prisma.jobStatusHistory.deleteMany({ where: { userId: { in: techIds } } });
      await prisma.session.deleteMany({ where: { userId: { in: techIds } } });
      await prisma.account.deleteMany({ where: { userId: { in: techIds } } });
      await prisma.user.deleteMany({ where: { id: { in: techIds } } });
    }

    // Seed technicians
    const techPassword = await bcrypt.hash('Password1!', 12);
    const createdTechs = [] as any[];
    for (let i = 0; i < count; i++) {
      const center = centers[i % centers.length];
      const t = await prisma.user.create({
        data: {
          name: `Tech ${i + 1}`,
          email: `seed.tech${Date.now()}_${i + 1}@example.com`,
          password: techPassword,
          roleId: techRole.id,
          isAvailable: true,
          preferredWorkingLocation: center.name,
          preferredLatitude: center.lat,
          preferredLongitude: center.lng,
          preferredRadiusKm: randRadius(),
        },
      });
      // Create 21 days of availability (8 AM - 8 PM Malaysian Time)
      const today = new Date();
      const windows = [];
      
      for (let i = 0; i < 21; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        
        // Malaysian time is UTC+8, so 8 AM Malaysian = 12 AM UTC, 8 PM Malaysian = 12 PM UTC
        const startUtc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0)); // 8 AM Malaysian = 12 AM UTC
        const endUtc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0)); // 8 PM Malaysian = 12 PM UTC
        
        windows.push({
          userId: t.id,
          startUtc,
          endUtc
        });
      }
      
      await prisma.technicianAvailabilityWindow.createMany({
        data: windows
      });
      createdTechs.push(t);
    }

    // Ensure at least one job type exists
    const jt = await prisma.jobType.findFirst();
    if (!jt) {
      const fallback = await prisma.jobType.create({ data: { name: 'General', description: 'General job' } });
      (jt as any) = fallback;
    }

    // Create a sample job near the first tech (2 PM - 4 PM Malaysian Time)
    const first = createdTechs[0];
    const now = new Date();
    const jobStart = new Date(now.getTime() + 60 * 60 * 1000); // +1h from now
    const jobEnd = new Date(now.getTime() + 3 * 60 * 60 * 1000); // +3h from now
    
    const job = await prisma.job.create({
      data: {
        jobTypeId: jt!.id,
        status: 'pending',
        startTime: jobStart,
        endTime: jobEnd,
        location: `Test job near ${first.preferredWorkingLocation}`,
        jobLatitude: first.preferredLatitude,
        jobLongitude: first.preferredLongitude,
        technicianId: null,
      },
    });

    return NextResponse.json({
      message: 'Technicians reset and seeded. Sample job created.',
      technicians: createdTechs.map(t => ({ id: t.id, email: t.email, center: t.preferredWorkingLocation, radiusKm: t.preferredRadiusKm })),
      job,
    });
  } catch (e) {
    console.error('Seed technicians error:', e);
    return NextResponse.json({ error: 'Failed to seed technicians' }, { status: 500 });
  }
}


