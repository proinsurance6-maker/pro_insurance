const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const admin = await prisma.admin.create({
      data: {
        name: 'Super Admin',
        email: 'admin@insurancebook.com',
        passwordHash: hashedPassword,
        phone: '9999999999',
        isActive: true
      }
    });
    
    console.log('✅ Admin user created successfully!');
    console.log('Email: admin@insurancebook.com');
    console.log('Password: admin123');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
