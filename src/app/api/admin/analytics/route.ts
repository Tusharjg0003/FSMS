import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Total jobs
    const totalJobs = await prisma.job.count();

    // Jobs by status
    const jobsByStatus = await prisma.job.groupBy({
      by: ['status'],
      _count: { _all: true },
    });

    // Jobs per technician
    const jobsPerTechnician = await prisma.job.groupBy({
      by: ['technicianId'],
      _count: { _all: true },
    });
    const techs = await prisma.user.findMany({ where: { role: { name: 'TECHNICIAN' } }, select: { id: true, name: true, email: true } });
    const jobsPerTechnicianDetailed = jobsPerTechnician.map(jpt => ({
      technician: techs.find(t => t.id === jpt.technicianId),
      count: jpt._count._all,
    })).filter(jpt => jpt.technician);

    // Jobs per job type
    const jobsPerJobType = await prisma.job.groupBy({
      by: ['jobTypeId'],
      _count: { _all: true },
    });
    const jobTypes = await prisma.jobType.findMany();
    const jobsPerJobTypeDetailed = jobsPerJobType.map(jpj => ({
      jobType: jobTypes.find(jt => jt.id === jpj.jobTypeId),
      count: jpj._count._all,
    })).filter(jpj => jpj.jobType);

    // Jobs completed per month (last 12 months)
    const now = new Date();
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }).reverse();
    const jobsCompletedPerMonth = await Promise.all(
      months.map(async (month) => {
        const [year, m] = month.split('-');
        const start = new Date(Number(year), Number(m) - 1, 1);
        const end = new Date(Number(year), Number(m), 1);
        const count = await prisma.job.count({
          where: {
            status: 'completed',
            endTime: { gte: start, lt: end },
          },
        });
        return { month, count };
      })
    );

    // Technician of the Month (most completed jobs in current month)
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    // Look for completed jobs in the last 30 days instead of just current month
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const completedJobsThisMonth = await prisma.job.findMany({
      where: {
        status: 'completed',
        endTime: {
          gte: thirtyDaysAgo,
          lte: now,
        },
        technicianId: { not: null },
      },
      select: { technicianId: true },
    });
    const completedCountByTech: Record<number, number> = {};
    completedJobsThisMonth.forEach(j => {
      if (j.technicianId) {
        completedCountByTech[j.technicianId] = (completedCountByTech[j.technicianId] || 0) + 1;
      }
    });
    let technicianOfTheMonth = null;
    if (Object.keys(completedCountByTech).length > 0) {
      const topTechId = Number(Object.entries(completedCountByTech).sort((a, b) => b[1] - a[1])[0][0]);
      const topTech = await prisma.user.findUnique({
        where: { id: topTechId },
        select: {
          id: true,
          name: true,
          email: true,
          profilePicture: true,
          nationality: true,
          dateOfBirth: true,
        },
      });
      if (topTech) {
        technicianOfTheMonth = {
          ...topTech,
          completedJobs: completedCountByTech[topTechId],
        };
      }
    }

    return NextResponse.json({
      totalJobs,
      jobsByStatus,
      jobsPerTechnician: jobsPerTechnicianDetailed,
      jobsPerJobType: jobsPerJobTypeDetailed,
      jobsCompletedPerMonth,
      technicianOfTheMonth,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
} 