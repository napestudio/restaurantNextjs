import { PrismaClient } from './app/generated/prisma/index.js';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function testAuth() {
  try {
    console.log('🔍 Testing database connection...');
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { username: 'admin' }
    });
    
    if (!user) {
      console.log('❌ User "admin" not found in database');
      return;
    }
    
    console.log('✅ User found:', {
      id: user.id,
      username: user.username,
      email: user.email,
      hasPassword: !!user.password
    });
    
    if (!user.password) {
      console.log('❌ User has no password set');
      return;
    }
    
    // Test password
    const testPassword = 'Admin@123';
    console.log(`🔐 Testing password: ${testPassword}`);
    
    const isValid = await bcrypt.compare(testPassword, user.password);
    
    if (isValid) {
      console.log('✅ Password is valid! Login should work.');
    } else {
      console.log('❌ Password is INVALID! This is the problem.');
      console.log('Password hash in DB:', user.password.substring(0, 20) + '...');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testAuth();
