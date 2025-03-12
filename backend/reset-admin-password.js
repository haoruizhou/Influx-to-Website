// reset-admin-password.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './db/models/user.js';

dotenv.config();

const resetAdminPassword = async () => {
  try {
    const dbUri = process.env.DATABASE_URI || process.env.DATABASE_URL;
    console.log('Connecting to MongoDB...');
    await mongoose.connect(dbUri);
    
    // Find the admin user
    const admin = await User.findOne({ username: 'admin' });
    if (!admin) {
      console.log('Admin user not found!');
      return;
    }
    
    // Force set a new password (bypassing the pre-save hook)
    const newPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Use updateOne directly to avoid triggering middleware
    const result = await User.updateOne(
      { _id: admin._id },
      { $set: { password: hashedPassword } }
    );
    
    console.log('Password reset result:', result);
    console.log('Admin password has been reset to "admin123"');
    
    // Verify the update worked
    const updatedAdmin = await User.findOne({ username: 'admin' });
    const isMatch = await bcrypt.compare(newPassword, updatedAdmin.password);
    console.log(`Verification - password matches: ${isMatch}`);
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
};

resetAdminPassword();