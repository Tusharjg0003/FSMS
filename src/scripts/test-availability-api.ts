import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testAvailabilityAPI() {
  try {
    console.log('🧪 Testing availability API directly...\n');
    
    // Get a technician
    const technician = await prisma.user.findFirst({
      where: { role: { name: 'TECHNICIAN' } },
      include: {
        availabilityWindows: {
          take: 5,
          orderBy: { startUtc: 'asc' }
        }
      }
    });
    
    if (!technician) {
      console.log('❌ No technicians found');
      return;
    }
    
    console.log(`👨‍🔧 Testing with technician: ${technician.name} (ID: ${technician.id})`);
    console.log(`📅 Total availability windows: ${technician.availabilityWindows.length}`);
    
    if (technician.availabilityWindows.length > 0) {
      console.log('\n📋 First few availability windows:');
      technician.availabilityWindows.forEach((window, index) => {
        const startMalaysia = new Date(window.startUtc.getTime() + (8 * 60 * 60 * 1000));
        const endMalaysia = new Date(window.endUtc.getTime() + (8 * 60 * 60 * 1000));
        console.log(`  ${index + 1}. ${window.startUtc.toISOString()} - ${window.endUtc.toISOString()}`);
        console.log(`     Malaysia time: ${startMalaysia.toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })} - ${endMalaysia.toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })}`);
      });
    }
    
    // Test different job times
    const testTimes = [
      {
        name: 'During availability window',
        startTime: new Date('2025-10-21T02:00:00.000Z'), // 10 AM Malaysia time
        endTime: new Date('2025-10-21T04:00:00.000Z'),   // 12 PM Malaysia time
      },
      {
        name: 'Outside availability window',
        startTime: new Date('2025-10-21T14:00:00.000Z'), // 10 PM Malaysia time
        endTime: new Date('2025-10-21T16:00:00.000Z'),   // 12 AM Malaysia time
      },
      {
        name: 'Edge case - exactly at window start',
        startTime: new Date('2025-10-21T00:00:00.000Z'), // 8 AM Malaysia time
        endTime: new Date('2025-10-21T02:00:00.000Z'),   // 10 AM Malaysia time
      }
    ];
    
    console.log('\n🧪 Testing availability queries:');
    
    for (const test of testTimes) {
      console.log(`\n📍 Test: ${test.name}`);
      console.log(`   Job time: ${test.startTime.toISOString()} - ${test.endTime.toISOString()}`);
      
      try {
        const availabilityWindows = await prisma.technicianAvailabilityWindow.findMany({
          where: {
            userId: technician.id,
            startUtc: { lte: test.startTime },
            endUtc: { gte: test.endTime }
          }
        });
        
        console.log(`   ✅ Query successful: Found ${availabilityWindows.length} matching windows`);
        
        if (availabilityWindows.length > 0) {
          availabilityWindows.forEach((window, index) => {
            console.log(`      ${index + 1}. ${window.startUtc.toISOString()} - ${window.endUtc.toISOString()}`);
          });
        }
        
      } catch (error) {
        console.log(`   ❌ Query failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error during availability API testing:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testAvailabilityAPI()
  .catch((error) => {
    console.error('💥 Availability API test failed:', error);
    process.exit(1);
  });
