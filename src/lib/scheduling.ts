import { PrismaClient, User } from '@prisma/client';

const prisma = new PrismaClient();

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function hasTimeOverlap(aStart: Date, aEnd: Date | null, bStart: Date, bEnd: Date): boolean {
  const endA = aEnd ?? new Date(aStart.getTime() + 60 * 60 * 1000); // default 60m
  return aStart < bEnd && bStart < endA;
}

export async function findEligibleTechniciansForJob(jobId: number) {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job || job.jobLatitude == null || job.jobLongitude == null) return [] as { tech: User; distanceKm: number; load: number }[];

  const start = job.startTime;
  const end = job.endTime ?? new Date(start.getTime() + 60 * 60 * 1000);

  const techs = await prisma.user.findMany({
    where: { role: { name: 'TECHNICIAN' }, isAvailable: true },
    select: {
      id: true,
      name: true,
      preferredLatitude: true,
      preferredLongitude: true,
      preferredRadiusKm: true,
    },
  });

  const dayStart = new Date(start);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(start);
  dayEnd.setHours(23, 59, 59, 999);

  const candidates: { tech: User; distanceKm: number; load: number }[] = [];

  for (const t of techs) {
    if (t.preferredLatitude == null || t.preferredLongitude == null || !t.preferredRadiusKm) continue;
    const dist = haversineKm(job.jobLatitude!, job.jobLongitude!, t.preferredLatitude, t.preferredLongitude);
    if (dist > t.preferredRadiusKm) continue;

    // Availability windows must have at least one overlap
    const windows = await prisma.technicianAvailabilityWindow.findMany({
      where: {
        userId: t.id,
        // fast coarse filter: any window that intersects [start-1d, end+1d]
        OR: [
          { startUtc: { lt: end }, endUtc: { gt: start } },
        ],
      },
      select: { startUtc: true, endUtc: true },
    });
    if (!windows.length) continue;
    const windowOk = windows.some(w => hasTimeOverlap(start, end, w.startUtc, w.endUtc));
    if (!windowOk) continue;

    // No existing job overlap
    const potentials = await prisma.job.findMany({
      where: {
        technicianId: t.id,
        status: { notIn: ['cancelled', 'completed'] },
        startTime: { lt: end },
        OR: [{ endTime: null }, { endTime: { gt: start } }],
      },
      select: { id: true, startTime: true, endTime: true },
    });
    const conflict = potentials.some(j => hasTimeOverlap(start, end, j.startTime, j.endTime ?? new Date(j.startTime.getTime() + 60 * 60 * 1000)));
    if (conflict) continue;

    const load = await prisma.job.count({
      where: {
        technicianId: t.id,
        status: { notIn: ['cancelled', 'completed'] },
        startTime: { gte: dayStart, lte: dayEnd },
      },
    });

    candidates.push({ tech: t as unknown as User, distanceKm: dist, load });
  }

  candidates.sort((a, b) => (a.distanceKm - b.distanceKm) || (a.load - b.load));
  return candidates;
}

export async function autoAssignTechnician(jobId: number) {
  const eligible = await findEligibleTechniciansForJob(jobId);
  if (!eligible.length) return null;
  return eligible[0].tech.id;
}


