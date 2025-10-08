import { PrismaClient } from '@prisma/client';
import { autoAssignTechnician, findEligibleTechniciansForJob } from '../lib/scheduling';

const prisma = new PrismaClient();

// Test locations across Malaysia
const testLocations = [
  {
    name: 'Kuala Lumpur City Center',
    location: 'Kuala Lumpur City Center, Kuala Lumpur, Malaysia',
    latitude: 3.1390,
    longitude: 101.6869,
    expectedTechnician: 'Ahmad Rahman' // Should be closest to KL
  },
  {
    name: 'Johor Bahru',
    location: 'Johor Bahru, Johor, Malaysia',
    latitude: 1.4927,
    longitude: 103.7414,
    expectedTechnician: 'Siti Nurhaliza' // Should be closest to JB
  },
  {
    name: 'Penang Island',
    location: 'George Town, Penang, Malaysia',
    latitude: 5.4164,
    longitude: 100.3327,
    expectedTechnician: 'Muhammad Ali' // Should be closest to Penang
  },
  {
    name: 'Cameron Highlands',
    location: 'Cameron Highlands, Pahang, Malaysia',
    latitude: 4.4690,
    longitude: 101.3768,
    expectedTechnician: 'Nurul Ain' // Should be closest to Cameron Highlands
  },
  {
    name: 'Kota Kinabalu',
    location: 'Kota Kinabalu, Sabah, Malaysia',
    latitude: 5.9804,
    longitude: 116.0735,
    expectedTechnician: 'Hassan Abdullah' // Should be closest to KK
  }
];

async function testAutoAssignment() {
  try {
    console.log('🧪 Starting auto-assignment tests...\n');
    
    // Get available job types
    const jobTypes = await prisma.jobType.findMany();
    if (jobTypes.length === 0) {
      console.log('❌ No job types found. Please run the seed script first.');
      return;
    }
    
    const jobType = jobTypes[0]; // Use first job type
    
    console.log(`📋 Using job type: ${jobType.name}\n`);
    
    // Test each location
    for (let i = 0; i < testLocations.length; i++) {
      const testLocation = testLocations[i];
      console.log(`📍 Test ${i + 1}: ${testLocation.name}`);
      console.log(`   Location: ${testLocation.location}`);
      console.log(`   Coordinates: (${testLocation.latitude}, ${testLocation.longitude})`);
      console.log(`   Expected technician: ${testLocation.expectedTechnician}`);
      
      // Create a test job
      const jobStartTime = new Date();
      jobStartTime.setHours(10, 0, 0, 0); // 10 AM today
      const jobEndTime = new Date(jobStartTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours later
      
      const testJob = await prisma.job.create({
        data: {
          jobTypeId: jobType.id,
          jobTypeName: jobType.name,
          status: 'pending',
          startTime: jobStartTime,
          endTime: jobEndTime,
          location: testLocation.location,
          jobLatitude: testLocation.latitude,
          jobLongitude: testLocation.longitude,
          customerName: `Test Customer ${i + 1}`,
          companyName: `Test Company ${i + 1}`,
          technicianId: null // Let auto-assignment handle this
        }
      });
      
      console.log(`   ✅ Created test job (ID: ${testJob.id})`);
      
      // Find eligible technicians
      console.log('   🔍 Finding eligible technicians...');
      const eligibleTechnicians = await findEligibleTechniciansForJob(testJob.id);
      
      if (eligibleTechnicians.length === 0) {
        console.log('   ❌ No eligible technicians found');
      } else {
        console.log(`   📊 Found ${eligibleTechnicians.length} eligible technicians:`);
        eligibleTechnicians.forEach((tech, index) => {
          const techData = tech.tech as any;
          console.log(`      ${index + 1}. ${techData.name} - Distance: ${tech.distanceKm.toFixed(2)}km, Load: ${tech.load} jobs`);
        });
        
        // Auto-assign technician
        console.log('   🎯 Auto-assigning technician...');
        const assignedTechnicianId = await autoAssignTechnician(testJob.id);
        
        if (assignedTechnicianId) {
          // Get technician details
          const assignedTechnician = await prisma.user.findUnique({
            where: { id: assignedTechnicianId },
            select: { name: true, preferredWorkingLocation: true }
          });
          
          if (assignedTechnician) {
            console.log(`   ✅ Assigned: ${assignedTechnician.name} (${assignedTechnician.preferredWorkingLocation})`);
            
            // Update the job with the assigned technician
            await prisma.job.update({
              where: { id: testJob.id },
              data: { technicianId: assignedTechnicianId }
            });
            
            // Check if assignment matches expectation
            if (assignedTechnician.name === testLocation.expectedTechnician) {
              console.log('   🎉 Assignment matches expectation!');
            } else {
              console.log(`   ⚠️  Assignment differs from expectation (${testLocation.expectedTechnician})`);
            }
          }
        } else {
          console.log('   ❌ Auto-assignment failed - no suitable technician found');
        }
      }
      
      console.log(''); // Empty line for readability
    }
    
    // Summary
    console.log('📊 Test Summary:');
    const assignedJobs = await prisma.job.findMany({
      where: { 
        technicianId: { not: null },
        customerName: { contains: 'Test Customer' }
      },
      include: {
        technician: { select: { name: true, preferredWorkingLocation: true } }
      }
    });
    
    console.log(`✅ ${assignedJobs.length}/${testLocations.length} jobs successfully assigned`);
    
    assignedJobs.forEach((job, index) => {
      console.log(`   ${index + 1}. ${job.location} → ${job.technician?.name} (${job.technician?.preferredWorkingLocation})`);
    });
    
    console.log('\n🎉 Auto-assignment testing completed!');
    
  } catch (error) {
    console.error('❌ Error during auto-assignment testing:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testAutoAssignment()
  .catch((error) => {
    console.error('💥 Auto-assignment test failed:', error);
    process.exit(1);
  });
