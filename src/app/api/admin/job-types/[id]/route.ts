import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';

const prisma = new PrismaClient();

<<<<<<< HEAD
// PATCH - Update job type
export async function PATCH(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> } // Change this
) {
=======
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
>>>>>>> feature/dynamic-scheduling-and-customer-fields
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id } = await params; 
    const { name, description } = await request.json();
    
    if (!name) {
      return NextResponse.json({ error: 'Job type name is required' }, { status: 400 });
    }
<<<<<<< HEAD
    
    const jobType = await prisma.jobType.update({
      where: { id: Number(id) }, // Change params.id to id
=======
    const { id } = await params;
    const jobType = await prisma.jobType.update({
      where: { id: Number(id) },
>>>>>>> feature/dynamic-scheduling-and-customer-fields
      data: { name, description: description || null },
    });
    
    return NextResponse.json(jobType);
  } catch (error) {
    console.error('Error updating job type:', error);
    return NextResponse.json({ error: 'Failed to update job type' }, { status: 500 });
  }
}

<<<<<<< HEAD
// DELETE - Soft delete
export async function DELETE(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> } // Change this
) {
=======
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
>>>>>>> feature/dynamic-scheduling-and-customer-fields
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
<<<<<<< HEAD

    const { id } = await params; 
    const jobTypeId = Number(id); 

    // Count active jobs 
    const activeJobsCount = await prisma.job.count({
      where: { 
        jobTypeId,
        status: { in: ['PENDING', 'IN_PROGRESS'] }
      }
    });

    // SOFT DELETE - Update JobType with deletedAt timestamp
    await prisma.jobType.update({
      where: { id: jobTypeId },
      data: { deletedAt: new Date() }
    });

    return NextResponse.json({
      message: 'Job type deleted successfully',
      activeJobsCount: activeJobsCount
    });
=======
    const { id } = await params;
    await prisma.jobType.delete({ where: { id: Number(id) } });
    return NextResponse.json({ message: 'Job type deleted' });
>>>>>>> feature/dynamic-scheduling-and-customer-fields
  } catch (error) {
    console.error('Error deleting job type:', error);
    return NextResponse.json({ error: 'Failed to delete job type' }, { status: 500 });
  }
}

// PUT - Restore deleted job type
export async function PUT(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const jobTypeId = Number(id);

    // Restore by setting deletedAt to null
    await prisma.jobType.update({
      where: { id: jobTypeId },
      data: { deletedAt: null }
    });
    
    return NextResponse.json({ 
      message: 'Job type restored successfully'
    });
  } catch (error) {
    console.error('Error restoring job type:', error);
    return NextResponse.json({ 
      error: 'Failed to restore job type' 
    }, { status: 500 });
  }
}