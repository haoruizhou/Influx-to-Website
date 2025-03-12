import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { authenticateToken, authorizeAdmin } from '../middleware/auth.js';
import User from '../db/models/user.js';

const router = express.Router();

// Login route
router.post('/login', [
    body('username').notEmpty(),
    body('password').notEmpty()
  ], async (req, res) => {
    try {
      console.log("Login request received:", req.body);
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const { username, password } = req.body;
      console.log(`Looking for user: ${username}`);
      
      const user = await User.findOne({ username });
      console.log('User found:', user ? 'yes' : 'no');
      
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      console.log('Comparing passwords...');
      const isMatch = await bcrypt.compare(password, user.password);
      console.log(`Password match: ${isMatch}`);
      
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      console.log('Creating token...');
      const token = jwt.sign(
        { userId: user._id, role: user.role }, 
        process.env.JWT_SECRET || 'fallback_secret_for_testing',
        { expiresIn: '24h' }
      );
      
      console.log('Sending response...');
      return res.json({ 
        token, 
        user: { 
          id: user._id, 
          username: user.username, 
          role: user.role,
          permissions: user.permissions
        } 
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ message: 'Server error during login' });
    }
  });

  
// Register route
router.post('/register', [
  // ... validation rules ...
], authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    // ... your registration code ...
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;  // Add this default export