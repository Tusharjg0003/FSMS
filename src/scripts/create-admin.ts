import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    console.log('👤 Creating admin user...');
    
    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@test.com' }
    });
    
    if (existingAdmin) {
      console.log('✅ Admin user already exists');
      return existingAdmin;
    }
    
    // Get or create ADMIN role
    let adminRole = await prisma.role.findUnique({
      where: { name: 'ADMIN' }
    });
    
    if (!adminRole) {
      adminRole = await prisma.role.create({
        data: { name: 'ADMIN' }
      });
      console.log('  ✅ Created ADMIN role');
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    // Create admin user
    const admin = await prisma.user.create({
      data: {
        name: 'Test Admin',
        email: 'admin@test.com',
        password: hashedPassword,
        roleId: adminRole.id,
        isAvailable: true
      }
    });
    
    console.log('✅ Admin user created successfully!');
    console.log(`📧 Email: admin@test.com`);
    console.log(`🔑 Password: admin123`);
    
    return admin;
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
