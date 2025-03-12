// fix-admin.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './db/models/user.js'; // Add this import

dotenv.config();

const fixAdmin = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URI);
    
    // No need to do this since we imported the model:
    // const User = mongoose.model('User');
    
    const admin = await User.findOne({ username: 'admin' });
    
    if (!admin) {
      console.log('Admin user not found!');
      return;
    }
    
    // Set a new plain password
    const newPassword = 'admin123';
    console.log(`Setting password to: ${newPassword}`);
    
    // Hash it
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update directly in the database
    const result = await User.updateOne(
      { _id: admin._id },
      { $set: { password: hashedPassword } }
    );
    
    console.log('Password reset result:', result);
    
    // Verify
    const updatedAdmin = await User.findOne({ username: 'admin' });
    console.log('Updated hash:', updatedAdmin.password);
    
    // Test password match
    const isMatch = await bcrypt.compare(newPassword, updatedAdmin.password);
    console.log(`Verification - password matches: ${isMatch}`);
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
};

fixAdmin();