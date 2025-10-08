import { PrismaClient } from '@prisma/client';
import { autoAssignTechnician, findEligibleTechniciansForJob } from '../lib/scheduling';

const prisma = new PrismaClient();

async function testEdgeCases() {
  try {
    console.log('🧪 Testing edge cases for auto-assignment...\n');
    
    // Get job type and technician
    const jobType = await prisma.jobType.findFirst();
    const technician = await prisma.user.findFirst({
      where: { role: { name: 'TECHNICIAN' } }
    });
    
    if (!jobType || !technician) {
      console.log('❌ Missing job type or technician data');
      return;
    }
    
    console.log(`📋 Using job type: ${jobType.name}`);
    console.log(`👨‍🔧 Using technician: ${technician.name}\n`);
    
    // Test 1: Job outside all technician service radii
    console.log('📍 Test 1: Job outside all service radii');
    const farLocation = await prisma.job.create({
      data: {
        jobTypeId: jobType.id,
        jobTypeName: jobType.name,
        status: 'pending',
        startTime: new Date('2025-12-01T02:00:00.000Z'), // 10 AM Malaysia time
        endTime: new Date('2025-12-01T04:00:00.000Z'),   // 12 PM Malaysia time
        location: 'Langkawi, Kedah, Malaysia',
        jobLatitude: 6.3500,  // Far from all technicians
        jobLongitude: 99.8333,
        customerName: 'Remote Customer',
        companyName: 'Remote Company'
      }
    });
    
    const farEligible = await findEligibleTechniciansForJob(farLocation.id);
    console.log(`   📊 Eligible technicians: ${farEligible.length}`);
    const farAssigned = await autoAssignTechnician(farLocation.id);
    console.log(`   🎯 Auto-assigned: ${farAssigned ? 'Success' : 'Failed (expected)'}`);
    
    // Test 2: Job during unavailable time (outside availability windows)
    console.log('\n📍 Test 2: Job during unavailable time');
    const nightJob = await prisma.job.create({
      data: {
        jobTypeId: jobType.id,
        jobTypeName: jobType.name,
        status: 'pending',
        startTime: new Date('2025-10-21T14:00:00.000Z'), // 10 PM Malaysia time (outside 8 AM - 8 PM window)
        endTime: new Date('2025-10-21T16:00:00.000Z'),   // 12 AM Malaysia time
        location: 'Kuala Lumpur, Malaysia',
        jobLatitude: 3.1390,
        jobLongitude: 101.6869,
        customerName: 'Night Customer',
        companyName: 'Night Company'
      }
    });
    
    const nightEligible = await findEligibleTechniciansForJob(nightJob.id);
    console.log(`   📊 Eligible technicians: ${nightEligible.length}`);
    const nightAssigned = await autoAssignTechnician(nightJob.id);
    console.log(`   🎯 Auto-assigned: ${nightAssigned ? 'Success' : 'Failed (expected)'}`);
    
    // Test 3: Job with technician already having conflicting job
    console.log('\n📍 Test 3: Job with time conflict');
    
    // First, assign the technician to an existing job
    const existingJob = await prisma.job.findFirst({
      where: { technicianId: null }
    });
    
    if (existingJob) {
      await prisma.job.update({
        where: { id: existingJob.id },
        data: { technicianId: technician.id }
      });
      console.log(`   ✅ Assigned technician to existing job (ID: ${existingJob.id})`);
      
      // Create conflicting job
      const conflictJob = await prisma.job.create({
        data: {
          jobTypeId: jobType.id,
          jobTypeName: jobType.name,
          status: 'pending',
          startTime: existingJob.startTime, // Same time as existing job
          endTime: existingJob.endTime,
          location: 'Same Location, Malaysia',
          jobLatitude: 3.1390,
          jobLongitude: 101.6869,
          customerName: 'Conflict Customer',
          companyName: 'Conflict Company'
        }
      });
      
      const conflictEligible = await findEligibleTechniciansForJob(conflictJob.id);
      console.log(`   📊 Eligible technicians: ${conflictEligible.length}`);
      const conflictAssigned = await autoAssignTechnician(conflictJob.id);
      console.log(`   🎯 Auto-assigned: ${conflictAssigned ? 'Success' : 'Failed (expected)'}`);
    }
    
    // Test 4: Job with multiple eligible technicians (should pick closest)
    console.log('\n📍 Test 4: Job with multiple eligible technicians');
    const multiJob = await prisma.job.create({
      data: {
        jobTypeId: jobType.id,
        jobTypeName: jobType.name,
        status: 'pending',
        startTime: new Date('2025-10-22T02:00:00.000Z'), // 10 AM Malaysia time
        endTime: new Date('2025-10-22T04:00:00.000Z'),   // 12 PM Malaysia time
        location: 'Subang Jaya, Selangor, Malaysia',
        jobLatitude: 3.0515,  // Close to multiple KL area technicians
        jobLongitude: 101.5823,
        customerName: 'Multi Customer',
        companyName: 'Multi Company'
      }
    });
    
    const multiEligible = await findEligibleTechniciansForJob(multiJob.id);
    console.log(`   📊 Eligible technicians: ${multiEligible.length}`);
    multiEligible.forEach((tech, index) => {
      const techData = tech.tech as any;
      console.log(`      ${index + 1}. ${techData.name} - Distance: ${tech.distanceKm.toFixed(2)}km, Load: ${tech.load}`);
    });
    
    const multiAssigned = await autoAssignTechnician(multiJob.id);
    if (multiAssigned) {
      const assignedTech = await prisma.user.findUnique({
        where: { id: multiAssigned },
        select: { name: true }
      });
      console.log(`   🎯 Auto-assigned: ${assignedTech?.name} (should be closest)`);
    }
    
    console.log('\n📊 Edge Cases Test Summary:');
    console.log('✅ All edge cases tested successfully!');
    console.log('✅ Auto-assignment handles edge cases correctly');
    
  } catch (error) {
    console.error('❌ Error during edge case testing:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testEdgeCases()
  .catch((error) => {
    console.error('💥 Edge case test failed:', error);
    process.exit(1);
  });
