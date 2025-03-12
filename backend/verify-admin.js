// verify-admin.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from './db/models/user.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const verifyAdmin = async () => {
  try {
    const dbUri = process.env.DATABASE_URI || process.env.DATABASE_URL;
    console.log('Connecting to MongoDB...');
    await mongoose.connect(dbUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Try to find the admin user
    const admin = await User.findOne({ username: 'admin' });
    console.log('Admin user found:', admin ? 'yes' : 'no');
    
    if (admin) {
      // Try to manually compare the password
      const testPassword = 'admin123';
      const isMatch = await bcrypt.compare(testPassword, admin.password);
      console.log(`Password 'admin123' matches: ${isMatch}`);
      
      if (!isMatch) {
        // If password doesn't match, explicitly set it
        console.log('Updating admin password...');
        admin.password = await bcrypt.hash(testPassword, 10);
        await admin.save();
        console.log('Admin password has been updated');
      }
    } else {
      console.log('No admin user found');
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
};

verifyAdmin();