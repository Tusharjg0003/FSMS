import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function showTestSummary() {
  try {
    console.log('📊 FSMS Auto-Assignment Test Summary\n');
    
    // Show technicians
    console.log('👨‍🔧 Test Technicians:');
    const technicians = await prisma.user.findMany({
      where: { role: { name: 'TECHNICIAN' } },
      include: {
        availabilityWindows: {
          select: { startUtc: true, endUtc: true },
          take: 3 // Show first 3 availability windows
        }
      },
      orderBy: { name: 'asc' }
    });
    
    technicians.forEach((tech, index) => {
      console.log(`  ${index + 1}. ${tech.name}`);
      console.log(`     📧 ${tech.email}`);
      console.log(`     📍 ${tech.preferredWorkingLocation}`);
      console.log(`     📏 Service Radius: ${tech.preferredRadiusKm}km`);
      console.log(`     ✅ Available: ${tech.isAvailable ? 'Yes' : 'No'}`);
      console.log(`     📅 Availability Windows: ${tech.availabilityWindows.length} total`);
      if (tech.availabilityWindows.length > 0) {
        const firstWindow = tech.availabilityWindows[0];
        const startMalaysia = new Date(firstWindow.startUtc.getTime() + (8 * 60 * 60 * 1000));
        const endMalaysia = new Date(firstWindow.endUtc.getTime() + (8 * 60 * 60 * 1000));
        console.log(`        First window: ${startMalaysia.toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur', hour: '2-digit', minute: '2-digit' })} - ${endMalaysia.toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur', hour: '2-digit', minute: '2-digit' })} MYT`);
      }
      console.log('');
    });
    
    // Show job types
    console.log('📋 Available Job Types:');
    const jobTypes = await prisma.jobType.findMany({
      orderBy: { name: 'asc' }
    });
    
    jobTypes.forEach((jobType, index) => {
      console.log(`  ${index + 1}. ${jobType.name}`);
      console.log(`     📝 ${jobType.description}`);
    });
    
    console.log('');
    
    // Show jobs and their assignments
    console.log('📝 Jobs and Assignments:');
    const jobs = await prisma.job.findMany({
      include: {
        jobType: { select: { name: true } },
        technician: { select: { name: true, preferredWorkingLocation: true } }
      },
      orderBy: { id: 'asc' }
    });
    
    jobs.forEach((job, index) => {
      const startMalaysia = new Date(job.startTime.getTime() + (8 * 60 * 60 * 1000));
      const endMalaysia = new Date(job.endTime!.getTime() + (8 * 60 * 60 * 1000));
      
      console.log(`  ${index + 1}. Job ID: ${job.id}`);
      console.log(`     📋 Type: ${job.jobType.name}`);
      console.log(`     📍 Location: ${job.location}`);
      console.log(`     ⏰ Time: ${startMalaysia.toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })} - ${endMalaysia.toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })} MYT`);
      console.log(`     👤 Customer: ${job.customerName} (${job.companyName})`);
      console.log(`     👨‍🔧 Assigned to: ${job.technician ? `${job.technician.name} (${job.technician.preferredWorkingLocation})` : 'Not assigned'}`);
      console.log(`     📊 Status: ${job.status}`);
      console.log('');
    });
    
    // Show statistics
    console.log('📊 Statistics:');
    const totalJobs = await prisma.job.count();
    const assignedJobs = await prisma.job.count({ where: { technicianId: { not: null } } });
    const pendingJobs = await prisma.job.count({ where: { status: 'pending' } });
    const totalAvailabilityWindows = await prisma.technicianAvailabilityWindow.count();
    
    console.log(`  📋 Total Jobs: ${totalJobs}`);
    console.log(`  ✅ Assigned Jobs: ${assignedJobs}`);
    console.log(`  ⏳ Pending Jobs: ${pendingJobs}`);
    console.log(`  👨‍🔧 Total Technicians: ${technicians.length}`);
    console.log(`  📅 Total Availability Windows: ${totalAvailabilityWindows}`);
    console.log(`  📋 Total Job Types: ${jobTypes.length}`);
    
    console.log('\n🎉 Test Data Summary Complete!');
    console.log('\n🔗 Next Steps:');
    console.log('  1. Login with admin@test.com / admin123');
    console.log('  2. Go to /jobs/create to create new jobs');
    console.log('  3. Enable auto-assignment to test the system');
    console.log('  4. View auto-assignment visualization for created jobs');
    console.log('  5. Check /admin/technician-locations to see technician locations');
    
  } catch (error) {
    console.error('❌ Error generating summary:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the summary
showTestSummary()
  .catch((error) => {
    console.error('💥 Summary generation failed:', error);
    process.exit(1);
  });
