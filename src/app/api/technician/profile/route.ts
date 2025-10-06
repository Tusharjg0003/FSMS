import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'TECHNICIAN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = await prisma.user.findUnique({
      where: { id: Number(session.user.id) },
      select: {
        id: true,
        name: true,
        email: true,
        profilePicture: true,
        nationality: true,
        dateOfBirth: true,
        preferredWorkingLocation: true,
      },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching technician profile:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'TECHNICIAN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { profilePicture, nationality, dateOfBirth, password, preferredWorkingLocation } = await request.json();
    const updateData: any = {
      profilePicture,
      nationality,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      preferredWorkingLocation,
    };
    if (password) {
      updateData.password = await bcrypt.hash(password, 12);
    }
    const user = await prisma.user.update({
      where: { id: Number(session.user.id) },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        profilePicture: true,
        nationality: true,
        dateOfBirth: true,
        preferredWorkingLocation: true,
      },
    });
    return NextResponse.json(user);
  } catch (error) {
    console.error('Error updating technician profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
} 