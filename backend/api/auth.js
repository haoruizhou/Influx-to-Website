import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { authenticateToken, authorizeAdmin } from '../middleware/auth.js';
import User from '../db/models/user.js'; 

const router = express.Router();

// Login route
// Login route
router.post('/login', [
    body('username').notEmpty(),
    body('password').notEmpty()
  ], async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const { username, password } = req.body;
      console.log(`Login attempt: username=${username}`);
      
      const user = await User.findOne({ username });
      console.log(`User found:`, user ? 'yes' : 'no');
      
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      console.log(`Comparing passwords: stored=${user.password.substring(0, 10)}...`);
      const isMatch = await bcrypt.compare(password, user.password);
      console.log(`Password match: ${isMatch}`);
      
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      const token = jwt.sign(
        { userId: user._id, role: user.role }, 
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      res.json({ 
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
      res.status(500).json({ message: error.message });
    }
  });

// Register new user (admin only)
router.post('/register', [
  body('username').notEmpty().isLength({ min: 3 }),
  body('password').isLength({ min: 8 }),
  body('email').isEmail(),
  body('role').optional().isIn(['admin', 'user'])
], authenticateToken, authorizeAdmin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { username, email } = req.body;
    
    // Check if username or email already exists
    const existingUser = await User.findOne({ 
      $or: [{ username }, { email }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        message: 'Username or email already in use' 
      });
    }
    
    const newUser = new User(req.body);
    await newUser.save();
    
    res.status(201).json({ 
      message: 'User created successfully',
      user: {
        id: newUser._id,
        username: newUser.username,
        role: newUser.role,
        permissions: newUser.permissions
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;