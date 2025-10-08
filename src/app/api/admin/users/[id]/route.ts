import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { geocodeAddress, validateMalaysiaCoordinates } from '@/lib/geocoding';

const prisma = new PrismaClient();

<<<<<<< HEAD
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
=======
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
>>>>>>> feature/dynamic-scheduling-and-customer-fields
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
<<<<<<< HEAD
    const { id } = await ctx.params;        // ← await it
    const user = await prisma.user.findUnique({
      where: { id: Number(id) },
      select: { id: true, name: true, email: true, roleId: true, role: { select: { name: true } } },
=======
    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id: Number(id) },
      select: {
        id: true,
        name: true,
        email: true,
        roleId: true,
        role: { select: { name: true } },
        // Technician location preferences
        preferredWorkingLocation: true,
        preferredLatitude: true,
        preferredLongitude: true,
        preferredRadiusKm: true,
        timezone: true,
        isAvailable: true,
      },
>>>>>>> feature/dynamic-scheduling-and-customer-fields
    });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

<<<<<<< HEAD
export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
=======
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
>>>>>>> feature/dynamic-scheduling-and-customer-fields
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
<<<<<<< HEAD
    const { id } = await ctx.params;        // ← await it
    const { name, email, password, roleId } = await request.json();
=======
    
    const { id } = await params;
    const { name, email, password, roleId, preferredWorkingLocation, preferredLatitude, preferredLongitude, preferredRadiusKm, timezone, isAvailable } = await request.json();
    
>>>>>>> feature/dynamic-scheduling-and-customer-fields
    if (!name || !email || !roleId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Auto-geocode preferred working location if provided and coordinates not given
    let finalLatitude = preferredLatitude;
    let finalLongitude = preferredLongitude;
    
    if (preferredWorkingLocation) {
      try {
        console.log(`🔍 Auto-geocoding preferred location: ${preferredWorkingLocation}`);
        const geocodeResult = await geocodeAddress(preferredWorkingLocation);
        
        // Check if geocoding was successful (no 'error' property means success)
        if (!('error' in geocodeResult)) {
          const { latitude, longitude } = geocodeResult;
          
          // Validate coordinates are in Malaysia
          if (validateMalaysiaCoordinates(latitude, longitude)) {
            finalLatitude = latitude;
            finalLongitude = longitude;
            console.log(`✅ Auto-geocoded ${preferredWorkingLocation} to (${latitude}, ${longitude})`);
          } else {
            console.log(`❌ Geocoded coordinates (${latitude}, ${longitude}) are outside Malaysia`);
          }
        } else {
          console.log(`❌ Failed to geocode ${preferredWorkingLocation}: ${geocodeResult.message}`);
        }
      } catch (error) {
        console.error(`❌ Error geocoding ${preferredWorkingLocation}:`, error);
      }
    }
    
    const updateData: any = { name, email, roleId: Number(roleId) };
<<<<<<< HEAD
    if (password) updateData.password = await bcrypt.hash(password, 12);

=======
    if (password) {
      updateData.password = await bcrypt.hash(password, 12);
    }
    
    // Add technician preferences if provided
    if (preferredWorkingLocation !== undefined) updateData.preferredWorkingLocation = preferredWorkingLocation;
    if (finalLatitude !== undefined) updateData.preferredLatitude = finalLatitude;
    if (finalLongitude !== undefined) updateData.preferredLongitude = finalLongitude;
    if (preferredRadiusKm !== undefined) updateData.preferredRadiusKm = preferredRadiusKm;
    if (timezone !== undefined) updateData.timezone = timezone;
    if (isAvailable !== undefined) updateData.isAvailable = isAvailable;
    
>>>>>>> feature/dynamic-scheduling-and-customer-fields
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

<<<<<<< HEAD
export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
=======
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
>>>>>>> feature/dynamic-scheduling-and-customer-fields
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

<<<<<<< HEAD
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
=======
    const { id } = await params;
    
    // Check if user exists and get their role
    const user = await prisma.user.findUnique({
      where: { id: Number(id) },
      select: { 
        id: true, 
        name: true, 
        role: { select: { name: true } },
        jobs: { select: { id: true } }
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If deleting a technician, handle related data cleanup
    if (user.role?.name === 'TECHNICIAN') {
      // Check if technician has assigned jobs
      const assignedJobs = await prisma.job.findMany({
        where: { technicianId: Number(id) },
        select: { id: true, status: true }
      });

      if (assignedJobs.length > 0) {
        const activeJobs = assignedJobs.filter(job => job.status !== 'COMPLETED');
        if (activeJobs.length > 0) {
          return NextResponse.json({ 
            error: `Cannot delete technician. They have ${activeJobs.length} active job(s) assigned. Please reassign or complete these jobs first.` 
          }, { status: 400 });
        }
      }

      // Delete technician availability windows
      await prisma.technicianAvailabilityWindow.deleteMany({
        where: { userId: Number(id) }
      });

      // Unassign completed jobs (set technicianId to null)
      await prisma.job.updateMany({
        where: { technicianId: Number(id) },
        data: { technicianId: null }
      });
    }

    // Delete the user
    await prisma.user.delete({ where: { id: Number(id) } });
    
    return NextResponse.json({ 
      message: `User ${user.name} deleted successfully`,
      deletedUser: {
        id: user.id,
        name: user.name,
        role: user.role?.name
      }
>>>>>>> feature/dynamic-scheduling-and-customer-fields
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
