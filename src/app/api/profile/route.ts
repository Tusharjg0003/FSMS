// src/app/api/profile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/lib/auth";

const prisma = new PrismaClient();

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, email, profilePicture } = await req.json();
    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required.' }, { status: 400 });
    }

    const me = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!me) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

    if (email !== me.email) {
      const exists = await prisma.user.findUnique({ where: { email } });
      if (exists) {
        return NextResponse.json(
          { error: 'Another account already uses this email.' },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.user.update({
    where: { id: me.id },
    data: {
        name: String(name),
        email: String(email),
        ...(profilePicture ? { profilePicture: String(profilePicture) } : {}),
    },
    select: { id: true, name: true, email: true, profilePicture: true },
    });

    return NextResponse.json({ user: updated, message: 'Profile updated.' });
  } catch (e) {
    console.error('PATCH /api/profile error:', e);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      name: true,
      email: true,
      profilePicture: true,
      role: { select: { name: true } },
    },
  });
  return NextResponse.json({ user });
}
