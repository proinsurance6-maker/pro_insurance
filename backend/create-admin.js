const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const admin = await prisma.subBroker.create({
      data: {
        name: 'Admin User',
        email: 'admin@example.com',
        phone: '1234567890',
        passwordHash: hashedPassword,
        brokerCode: 'ADMIN001',
        role: 'ADMIN',
        isActive: true
      }
    });
    
    console.log('✅ Admin user created successfully!');
    console.log('Email: admin@example.com');
    console.log('Password: admin123');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
