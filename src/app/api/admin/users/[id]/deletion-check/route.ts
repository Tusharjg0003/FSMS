import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/lib/auth";

const prisma = new PrismaClient();

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await ctx.params;
  const userId = Number(id);

  // Anything not Completed or Cancelled is considered incomplete
  const incomplete = await prisma.job.count({
    where: {
      technicianId: userId,
      NOT: { status: { in: ['Completed', 'Cancelled'] } },
    },
  });

  return NextResponse.json({ incomplete });
}
