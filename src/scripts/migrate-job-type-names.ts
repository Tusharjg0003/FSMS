import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateJobTypeNames() {
  console.log('Starting job type name migration...');

  try {
    // Get all jobs that don't have a jobTypeName set
    const jobsToUpdate = await prisma.job.findMany({
      where: {
        jobTypeName: null
      },
      include: {
        jobType: true
      }
    });

    console.log(`Found ${jobsToUpdate.length} jobs to update`);

    let updateCount = 0;
    
    // Update each job with its current job type name as a snapshot
    for (const job of jobsToUpdate) {
      if (job.jobType) {
        await prisma.job.update({
          where: { id: job.id },
          data: {
            jobTypeName: job.jobType.name
          }
        });
        
        updateCount++;
        console.log(`Updated job ${job.id} with jobTypeName: "${job.jobType.name}"`);
      }
    }

    console.log(`Successfully updated ${updateCount} jobs with job type names`);
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateJobTypeNames()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  });