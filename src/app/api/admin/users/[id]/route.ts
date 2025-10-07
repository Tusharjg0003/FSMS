import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';

const prisma = new PrismaClient();

// export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
//   try {
//     const session = await getServerSession(authOptions);
//     if (!session || session.user.role !== 'ADMIN') {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//     }
//     const user = await prisma.user.findUnique({
//       where: { id: Number(params.id) },
//       select: {
//         id: true,
//         name: true,
//         email: true,
//         roleId: true,
//         role: { select: { name: true } },
//       },
//     });
//     if (!user) {
//       return NextResponse.json({ error: 'User not found' }, { status: 404 });
//     }
//     return NextResponse.json(user);
//   } catch (error) {
//     console.error('Error fetching user:', error);
//     return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
//   }
// }

// export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
//   try {
//     const session = await getServerSession(authOptions);
//     if (!session || session.user.role !== 'ADMIN') {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//     }
//     const { name, email, password, roleId } = await request.json();
//     if (!name || !email || !roleId) {
//       return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
//     }
//     const updateData: any = { name, email, roleId: Number(roleId) };
//     if (password) {
//       updateData.password = await bcrypt.hash(password, 12);
//     }
//     const user = await prisma.user.update({
//       where: { id: Number(params.id) },
//       data: updateData,
//       select: {
//         id: true,
//         name: true,
//         email: true,
//         role: { select: { name: true } },
//       },
//     });
//     return NextResponse.json(user);
//   } catch (error) {
//     console.error('Error updating user:', error);
//     return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
//   }
// }

// // export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
// //   try {
// //     const session = await getServerSession(authOptions);
// //     if (!session || session.user.role !== 'ADMIN') {
// //       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
// //     }
// //     await prisma.user.delete({ where: { id: Number(params.id) } });
// //     return NextResponse.json({ message: 'User deleted' });
// //   } catch (error) {
// //     console.error('Error deleting user:', error);
// //     return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
// //   }
// // } 


// export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
//   try {
//     const session = await getServerSession(authOptions);
//     if (!session || session.user.role !== 'ADMIN') {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//     }

//     const userId = Number(params.id);

//     // Ensure the user exists & is a technician
//     const tech = await prisma.user.findUnique({
//       where: { id: userId },
//       include: { role: true },
//     });
//     if (!tech) {
//       return NextResponse.json({ error: 'User not found' }, { status: 404 });
//     }
//     if (tech.role?.name !== 'TECHNICIAN') {
//       return NextResponse.json({ error: 'Only technicians can be deleted' }, { status: 400 });
//     }

//     // Block deletion if there are active jobs (Pending or In Progress)
//     const activeJobsCount = await prisma.job.count({
//       where: { technicianId: userId, status: { in: ['Pending', 'In Progress'] } },
//     });
//     if (activeJobsCount > 0) {
//       return NextResponse.json(
//         {
//           error: 'Deletion blocked',
//           reason: 'Technician still has active (Pending or In Progress) jobs.',
//           counts: { active: activeJobsCount },
//         },
//         { status: 409 }
//       );
//     }

//     // Proceed with soft-delete:
//     // - Unassign all non-completed jobs & flag for reassignment
//     // - Keep completed jobs linked (audit history)
//     // - Soft delete the technician
//     await prisma.$transaction(async (tx) => {
//       await tx.job.updateMany({
//         where: {
//           technicianId: userId,
//           NOT: { status: 'Completed' },
//         },
//         data: {
//           technicianId: null,
//           needsReassignment: true,
//           reassignmentNote: 'Technician deleted; requires reassignment.',
//         },
//       });

//       await tx.user.update({
//         where: { id: userId },
//         data: {
//           isActive: false,
//           deletedAt: new Date(),
//         },
//       });
//     });

//     return NextResponse.json({
//       message: 'Technician deleted (soft). Incomplete jobs flagged for reassignment.',
//     });
//   } catch (error) {
//     console.error('Error deleting user:', error);
//     return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
//   }
// }



export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await ctx.params;        // ← await it
    const user = await prisma.user.findUnique({
      where: { id: Number(id) },
      select: { id: true, name: true, email: true, roleId: true, role: { select: { name: true } } },
    });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await ctx.params;        // ← await it
    const { name, email, password, roleId } = await request.json();
    if (!name || !email || !roleId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const updateData: any = { name, email, roleId: Number(roleId) };
    if (password) updateData.password = await bcrypt.hash(password, 12);

    const user = await prisma.user.update({
      where: { id: Number(id) },
      data: updateData,
      select: { id: true, name: true, email: true, role: { select: { name: true } } },
    });
    return NextResponse.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await ctx.params;
    const userId = Number(id);

    const tech = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });
    if (!tech) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (tech.role?.name !== 'TECHNICIAN') {
      return NextResponse.json({ error: 'Only technicians can be deleted' }, { status: 400 });
    }

    // Block if any job is NOT Completed or Cancelled
    const incompleteCount = await prisma.job.count({
      where: {
        technicianId: userId,
        NOT: { status: { in: ['Completed', 'Cancelled'] } },
      },
    });
    if (incompleteCount > 0) {
      return NextResponse.json(
        {
          error: 'Deletion blocked',
          reason: 'Technician still has incomplete jobs.',
          counts: { incomplete: incompleteCount },
        },
        { status: 409 }
      );
    }

    // Proceed with soft-delete + (safety) unassign any remaining non-completed just in case
    await prisma.$transaction(async (tx) => {
      const targets = await tx.job.findMany({
        where: {
          technicianId: userId,
          NOT: { status: { in: ['Completed', 'Cancelled'] } },
        },
        select: { id: true },
      });

      await Promise.all(
        targets.map(({ id }) =>
          tx.job.update({
            where: { id },
            data: {
              technician: { disconnect: true },
              needsReassignment: true,
              reassignmentNote: 'Technician deleted; requires reassignment.',
            },
          })
        )
      );

      await tx.user.update({
        where: { id: userId },
        data: { isActive: false, deletedAt: new Date() },
      });
    });

    return NextResponse.json({
      message: 'Technician deleted (soft). Incomplete jobs flagged for reassignment.',
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
