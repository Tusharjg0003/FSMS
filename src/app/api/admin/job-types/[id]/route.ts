import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';

const prisma = new PrismaClient();

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { name, description } = await request.json();
    if (!name) {
      return NextResponse.json({ error: 'Job type name is required' }, { status: 400 });
    }
    const { id } = await params;
    const jobType = await prisma.jobType.update({
      where: { id: Number(id) },
      data: { name, description: description || null },
    });
    return NextResponse.json(jobType);
  } catch (error) {
    console.error('Error updating job type:', error);
    return NextResponse.json({ error: 'Failed to update job type' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    await prisma.jobType.delete({ where: { id: Number(id) } });
    return NextResponse.json({ message: 'Job type deleted' });
  } catch (error) {
    console.error('Error deleting job type:', error);
    return NextResponse.json({ error: 'Failed to delete job type' }, { status: 500 });
  }
} 