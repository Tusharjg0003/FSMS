import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Create job types if not present
  const jobTypes = [
    { name: 'Installation', description: 'Install new equipment' },
    { name: 'Repair', description: 'Repair malfunctioning equipment' },
    { name: 'Maintenance', description: 'Routine maintenance' },
    { name: 'Inspection', description: 'Inspect equipment' },
  ];
  for (const jt of jobTypes) {
    const existing = await prisma.jobType.findFirst({ where: { name: jt.name } });
    if (!existing) {
      await prisma.jobType.create({ data: jt });
    }
  }

  // Get job type IDs
  const allJobTypes = await prisma.jobType.findMany();

  // Create 10 technicians
  const techs = [];
  const techPassword = await bcrypt.hash('password123', 12);
  const techRole = await prisma.role.findUnique({ where: { name: 'TECHNICIAN' } });
  for (let i = 1; i <= 10; i++) {
    const tech = await prisma.user.upsert({
      where: { email: `tech${i}@mail.com` },
      update: {},
      create: {
        name: `Technician ${i}`,
        email: `tech${i}@mail.com`,
        password: techPassword,
        roleId: techRole?.id || 3,
      },
    });
    techs.push(tech);
  }

  // Create jobs with various statuses and assign randomly to technicians
  const statuses = ['pending', 'in progress', 'completed', 'cancelled'];
  for (let i = 1; i <= 20; i++) {
    const jobType = allJobTypes[Math.floor(Math.random() * allJobTypes.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const tech = techs[Math.floor(Math.random() * techs.length)];
    await prisma.job.create({
      data: {
        jobTypeId: jobType.id,
        jobTypeName: jobType.name, // snapshot of name at creation
        status,
        startTime: new Date(Date.now() - Math.floor(Math.random() * 1000000000)),
        endTime: status === 'completed' ? new Date() : null,
        location: `Location ${i}`,
        technicianId: tech.id,
      },
    });
  }

  // Create some completed jobs in the current month for Technician of the Month
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  // Give Technician 1 more completed jobs this month
  for (let i = 1; i <= 5; i++) {
    await prisma.job.create({
      data: {
        jobTypeId: allJobTypes[0].id,
        jobTypeName: allJobTypes[0].name,
        status: 'completed',
        startTime: new Date(currentYear, currentMonth, Math.floor(Math.random() * 28) + 1),
        endTime: new Date(currentYear, currentMonth, Math.floor(Math.random() * 28) + 1),
        location: `Current Month Location ${i}`,
        technicianId: techs[0].id, // Technician 1
      },
    });
  }
  
  // Give Technician 2 some completed jobs this month too
  for (let i = 1; i <= 3; i++) {
    await prisma.job.create({
      data: {
        jobTypeId: allJobTypes[1].id,
        jobTypeName: allJobTypes[1].name,
        status: 'completed',
        startTime: new Date(currentYear, currentMonth, Math.floor(Math.random() * 28) + 1),
        endTime: new Date(currentYear, currentMonth, Math.floor(Math.random() * 28) + 1),
        location: `Current Month Location ${i + 5}`,
        technicianId: techs[1].id, // Technician 2
      },
    });
  }

  console.log('Seeded 10 technicians and 20 jobs with various statuses.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 