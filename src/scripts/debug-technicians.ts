import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugTechnicians() {
  try {
    console.log('🔍 Debugging technicians and their availability windows...\n');
    
    const technicians = await prisma.user.findMany({
      where: { role: { name: 'TECHNICIAN' } },
      include: {
        availabilityWindows: {
          orderBy: { startUtc: 'asc' }
        }
      },
      orderBy: { id: 'asc' }
    });
    
    console.log(`📊 Found ${technicians.length} technicians:\n`);
    
    technicians.forEach((tech, index) => {
      console.log(`${index + 1}. ${tech.name} (ID: ${tech.id})`);
      console.log(`   📧 Email: ${tech.email}`);
      console.log(`   📍 Location: ${tech.preferredWorkingLocation}`);
      console.log(`   📏 Radius: ${tech.preferredRadiusKm}km`);
      console.log(`   ✅ Available: ${tech.isAvailable}`);
      console.log(`   📅 Availability Windows: ${tech.availabilityWindows.length}`);
      
      if (tech.availabilityWindows.length === 0) {
        console.log('   ⚠️  WARNING: No availability windows found!');
      } else {
        // Show first and last window
        const first = tech.availabilityWindows[0];
        const last = tech.availabilityWindows[tech.availabilityWindows.length - 1];
        
        const firstStart = new Date(first.startUtc.getTime() + (8 * 60 * 60 * 1000));
        const firstEnd = new Date(first.endUtc.getTime() + (8 * 60 * 60 * 1000));
        const lastStart = new Date(last.startUtc.getTime() + (8 * 60 * 60 * 1000));
        const lastEnd = new Date(last.endUtc.getTime() + (8 * 60 * 60 * 1000));
        
        console.log(`   📅 First window: ${firstStart.toLocaleDateString('en-MY')} ${firstStart.toLocaleTimeString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })} - ${firstEnd.toLocaleTimeString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })} MYT`);
        console.log(`   📅 Last window:  ${lastStart.toLocaleDateString('en-MY')} ${lastStart.toLocaleTimeString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })} - ${lastEnd.toLocaleTimeString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })} MYT`);
      }
      
      console.log('');
    });
    
    // Check for technicians with no availability windows
    const techsWithoutWindows = technicians.filter(tech => tech.availabilityWindows.length === 0);
    
    if (techsWithoutWindows.length > 0) {
      console.log('⚠️  TECHNICIANS WITHOUT AVAILABILITY WINDOWS:');
      techsWithoutWindows.forEach(tech => {
        console.log(`   - ${tech.name} (ID: ${tech.id})`);
      });
      console.log('');
    }
    
    // Test a specific problematic time that was in the logs
    const problematicTime = {
      startTime: new Date('2025-10-13T23:15:00.000Z'),
      endTime: new Date('2025-10-14T02:15:00.000Z')
    };
    
    console.log(`🧪 Testing problematic time from logs:`);
    console.log(`   Job time: ${problematicTime.startTime.toISOString()} - ${problematicTime.endTime.toISOString()}`);
    console.log(`   Malaysia time: ${new Date(problematicTime.startTime.getTime() + (8 * 60 * 60 * 1000)).toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })} - ${new Date(problematicTime.endTime.getTime() + (8 * 60 * 60 * 1000)).toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })} MYT`);
    
    console.log('\n📋 Results for each technician:');
    
    for (const tech of technicians) {
      try {
        const windows = await prisma.technicianAvailabilityWindow.findMany({
          where: {
            userId: tech.id,
            startUtc: { lte: problematicTime.startTime },
            endUtc: { gte: problematicTime.endTime }
          }
        });
        
        console.log(`   ${tech.name} (ID: ${tech.id}): ${windows.length} matching windows`);
        
        if (windows.length === 0 && tech.availabilityWindows.length > 0) {
          // Check if there are any overlapping windows at all
          const overlappingWindows = await prisma.technicianAvailabilityWindow.findMany({
            where: {
              userId: tech.id,
              startUtc: { lt: problematicTime.endTime },
              endUtc: { gt: problematicTime.startTime }
            }
          });
          console.log(`      (${overlappingWindows.length} overlapping windows found)`);
        }
        
      } catch (error) {
        console.log(`   ${tech.name} (ID: ${tech.id}): ERROR - ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error during technician debugging:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the debug
debugTechnicians()
  .catch((error) => {
    console.error('💥 Technician debugging failed:', error);
    process.exit(1);
  });
