// File: scripts/setup-admin.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../db/models/user.js';

// 1) Resolve the path to your .env in the parent directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from the project root (one level up)
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const createOrUpdateAdminUser = async () => {
  try {
    // 2) Get the DB URI from environment variables
    const dbUri = process.env.DATABASE_URI || process.env.DATABASE_URL;
    if (!dbUri) {
      throw new Error('No DATABASE_URI or DATABASE_URL found in .env');
    }

    console.log('Connecting to MongoDB with URI:', dbUri);

    // 3) Connect to MongoDB via Mongoose
    await mongoose.connect(dbUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // 4) Check if an admin user already exists
    let adminUser = await User.findOne({ role: 'admin' });
    const hashedPassword = await bcrypt.hash('admin123', 10);

    if (adminUser) {
      // If admin exists, update its password
      adminUser.password = hashedPassword;
      await adminUser.save();
      console.log('Admin user password updated successfully');
    } else {
      // Otherwise, create a new admin user
      adminUser = new User({
        username: 'admin',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'admin',
        permissions: ['all'],
      });
      await adminUser.save();
      console.log('Admin user created successfully');
    }

    // 5) Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Mongoose disconnected. Done!');
  } catch (error) {
    console.error('Error creating/updating admin user:', error);
    process.exit(1);
  }
};

// Run the script
createOrUpdateAdminUser();
