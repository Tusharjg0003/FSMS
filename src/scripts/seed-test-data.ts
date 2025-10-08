import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Test technicians with different locations across Malaysia
const testTechnicians = [
  {
    name: 'Ahmad Rahman',
    email: 'ahmad.rahman@test.com',
    password: 'password123',
    preferredWorkingLocation: 'Kuala Lumpur, Malaysia',
    preferredLatitude: 3.1390,
    preferredLongitude: 101.6869,
    preferredRadiusKm: 25,
    timezone: 'Asia/Kuala_Lumpur'
  },
  {
    name: 'Siti Nurhaliza',
    email: 'siti.nurhaliza@test.com',
    password: 'password123',
    preferredWorkingLocation: 'Johor Bahru, Malaysia',
    preferredLatitude: 1.4927,
    preferredLongitude: 103.7414,
    preferredRadiusKm: 30,
    timezone: 'Asia/Kuala_Lumpur'
  },
  {
    name: 'Muhammad Ali',
    email: 'muhammad.ali@test.com',
    password: 'password123',
    preferredWorkingLocation: 'Penang, Malaysia',
    preferredLatitude: 5.4164,
    preferredLongitude: 100.3327,
    preferredRadiusKm: 20,
    timezone: 'Asia/Kuala_Lumpur'
  },
  {
    name: 'Fatimah Zahra',
    email: 'fatimah.zahra@test.com',
    password: 'password123',
    preferredWorkingLocation: 'Ipoh, Malaysia',
    preferredLatitude: 4.5975,
    preferredLongitude: 101.0901,
    preferredRadiusKm: 35,
    timezone: 'Asia/Kuala_Lumpur'
  },
  {
    name: 'Hassan Abdullah',
    email: 'hassan.abdullah@test.com',
    password: 'password123',
    preferredWorkingLocation: 'Kota Kinabalu, Malaysia',
    preferredLatitude: 5.9804,
    preferredLongitude: 116.0735,
    preferredRadiusKm: 40,
    timezone: 'Asia/Kuala_Lumpur'
  },
  {
    name: 'Aisyah Binti',
    email: 'aisyah.binti@test.com',
    password: 'password123',
    preferredWorkingLocation: 'Kuching, Malaysia',
    preferredLatitude: 1.5533,
    preferredLongitude: 110.3593,
    preferredRadiusKm: 30,
    timezone: 'Asia/Kuala_Lumpur'
  },
  {
    name: 'Omar Al-Maliki',
    email: 'omar.almaliki@test.com',
    password: 'password123',
    preferredWorkingLocation: 'Melaka, Malaysia',
    preferredLatitude: 2.1896,
    preferredLongitude: 102.2501,
    preferredRadiusKm: 25,
    timezone: 'Asia/Kuala_Lumpur'
  },
  {
    name: 'Nurul Ain',
    email: 'nurul.ain@test.com',
    password: 'password123',
    preferredWorkingLocation: 'Cameron Highlands, Malaysia',
    preferredLatitude: 4.4690,
    preferredLongitude: 101.3768,
    preferredRadiusKm: 15,
    timezone: 'Asia/Kuala_Lumpur'
  }
];

// Test job types
const testJobTypes = [
  { name: 'Air Conditioning Repair', description: 'Repair and maintenance of air conditioning systems' },
  { name: 'Electrical Installation', description: 'Electrical wiring and installation services' },
  { name: 'Plumbing Service', description: 'Plumbing repairs and installations' },
  { name: 'Appliance Repair', description: 'Home appliance repair and maintenance' },
  { name: 'Carpentry Work', description: 'Woodwork and furniture repairs' }
];

// Test jobs in different locations
const testJobs = [
  {
    jobTypeName: 'Air Conditioning Repair',
    location: 'Petaling Jaya, Selangor, Malaysia',
    jobLatitude: 3.1073,
    jobLongitude: 101.6085,
    startTime: new Date('2025-10-21T10:00:00.000Z'), // 6 PM Malaysia time
    endTime: new Date('2025-10-21T12:00:00.000Z'),   // 8 PM Malaysia time
    customerName: 'John Smith',
    companyName: 'TechCorp Sdn Bhd'
  },
  {
    jobTypeName: 'Electrical Installation',
    location: 'Shah Alam, Selangor, Malaysia',
    jobLatitude: 3.0733,
    jobLongitude: 101.5185,
    startTime: new Date('2025-10-21T14:00:00.000Z'), // 10 PM Malaysia time
    endTime: new Date('2025-10-21T16:00:00.000Z'),   // 12 AM Malaysia time
    customerName: 'Sarah Johnson',
    companyName: 'Innovation Hub'
  },
  {
    jobTypeName: 'Plumbing Service',
    location: 'Subang Jaya, Selangor, Malaysia',
    jobLatitude: 3.0515,
    jobLongitude: 101.5823,
    startTime: new Date('2025-10-22T02:00:00.000Z'), // 10 AM Malaysia time
    endTime: new Date('2025-10-22T04:00:00.000Z'),   // 12 PM Malaysia time
    customerName: 'David Lee',
    companyName: 'Residential Complex'
  }
];

async function createAvailabilityWindows(userId: number, days: number = 21) {
  const windows = [];
  const today = new Date();
  
  for (let i = 0; i < days; i++) {
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + i);
    
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const day = targetDate.getDate();
    
    // Convert Malaysia time (UTC+8) to actual UTC
    // 8 AM Malaysia = midnight UTC, 8 PM Malaysia = noon UTC
    const startUTC = new Date(year, month, day, 0, 0, 0);
    const endUTC = new Date(year, month, day, 12, 0, 0);
    
    windows.push({
      userId,
      startUtc: startUTC,
      endUtc: endUTC
    });
  }
  
  return windows;
}

async function main() {
  try {
    console.log('🌱 Starting test data seeding...');

    // Clear existing data (be careful in production!)
    console.log('🧹 Clearing existing test data...');
    await prisma.technicianAvailabilityWindow.deleteMany();
    await prisma.jobStatusHistory.deleteMany();
    await prisma.technicianReport.deleteMany();
    await prisma.job.deleteMany();
    await prisma.user.deleteMany({ where: { email: { contains: '@test.com' } } });
    await prisma.jobType.deleteMany();

    // Create job types
    console.log('📋 Creating job types...');
    const jobTypes = [];
    for (const jobType of testJobTypes) {
      const created = await prisma.jobType.create({
        data: jobType
      });
      jobTypes.push(created);
      console.log(`  ✅ Created job type: ${created.name}`);
    }

    // Get or create TECHNICIAN role
    let technicianRole = await prisma.role.findUnique({
      where: { name: 'TECHNICIAN' }
    });
    
    if (!technicianRole) {
      technicianRole = await prisma.role.create({
        data: { name: 'TECHNICIAN' }
      });
      console.log('  ✅ Created TECHNICIAN role');
    }

    // Create technicians
    console.log('👨‍🔧 Creating test technicians...');
    const technicians = [];
    
    for (const techData of testTechnicians) {
      // Hash password
      const hashedPassword = await bcrypt.hash(techData.password, 12);
      
      // Create technician
      const technician = await prisma.user.create({
        data: {
          name: techData.name,
          email: techData.email,
          password: hashedPassword,
          roleId: technicianRole.id,
          preferredWorkingLocation: techData.preferredWorkingLocation,
          preferredLatitude: techData.preferredLatitude,
          preferredLongitude: techData.preferredLongitude,
          preferredRadiusKm: techData.preferredRadiusKm,
          timezone: techData.timezone,
          isAvailable: true
        }
      });
      
      technicians.push(technician);
      console.log(`  ✅ Created technician: ${technician.name} (${technician.preferredWorkingLocation})`);
      
      // Create availability windows
      const windows = await createAvailabilityWindows(technician.id);
      await prisma.technicianAvailabilityWindow.createMany({
        data: windows
      });
      console.log(`    📅 Created ${windows.length} availability windows`);
    }

    // Create test jobs
    console.log('📝 Creating test jobs...');
    const jobs = [];
    
    for (const jobData of testJobs) {
      // Find the job type
      const jobType = jobTypes.find(jt => jt.name === jobData.jobTypeName);
      if (!jobType) {
        console.log(`  ⚠️  Job type not found: ${jobData.jobTypeName}`);
        continue;
      }
      
      const job = await prisma.job.create({
        data: {
          jobTypeId: jobType.id,
          jobTypeName: jobType.name,
          status: 'pending',
          startTime: jobData.startTime,
          endTime: jobData.endTime,
          location: jobData.location,
          jobLatitude: jobData.jobLatitude,
          jobLongitude: jobData.jobLongitude,
          customerName: jobData.customerName,
          companyName: jobData.companyName,
          // Don't assign technician yet - let auto-assignment handle it
          technicianId: null
        }
      });
      
      jobs.push(job);
      console.log(`  ✅ Created job: ${jobData.jobTypeName} at ${jobData.location}`);
    }

    console.log('\n🎉 Test data seeding completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`  - ${jobTypes.length} job types created`);
    console.log(`  - ${technicians.length} technicians created`);
    console.log(`  - ${jobs.length} test jobs created`);
    console.log(`  - ${technicians.length * 21} availability windows created`);
    
    console.log('\n🔧 Test technicians created:');
    technicians.forEach(tech => {
      console.log(`  - ${tech.name} (${tech.preferredWorkingLocation}) - Radius: ${tech.preferredLatitude ? 'Set' : 'Not set'}`);
    });
    
    console.log('\n📋 Test jobs created:');
    jobs.forEach((job, index) => {
      const startMalaysia = new Date(job.startTime.getTime() + (8 * 60 * 60 * 1000));
      console.log(`  - Job ${index + 1}: ${job.jobTypeName} at ${job.location}`);
      console.log(`    Time: ${startMalaysia.toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })}`);
    });

  } catch (error) {
    console.error('❌ Error seeding test data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding
main()
  .catch((error) => {
    console.error('💥 Seeding failed:', error);
    process.exit(1);
  });
