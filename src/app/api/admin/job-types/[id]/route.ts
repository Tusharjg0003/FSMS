import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';

const prisma = new PrismaClient();

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { name, description } = await request.json();
    if (!name) {
      return NextResponse.json({ error: 'Job type name is required' }, { status: 400 });
    }
    const jobType = await prisma.jobType.update({
      where: { id: Number(params.id) },
      data: { name, description: description || null },
    });
    return NextResponse.json(jobType);
  } catch (error) {
    console.error('Error updating job type:', error);
    return NextResponse.json({ error: 'Failed to update job type' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await prisma.jobType.delete({ where: { id: Number(params.id) } });
    return NextResponse.json({ message: 'Job type deleted' });
  } catch (error) {
    console.error('Error deleting job type:', error);
    return NextResponse.json({ error: 'Failed to delete job type' }, { status: 500 });
  }
} 