import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../libs/dbConnect';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  userID: { type: String, required: true, unique: true }, // Unique ID for matchmaking
  isOnline: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

// Generate unique user ID
const generateUserID = () => {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `USER_${timestamp}_${random}`;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();

  if (req.method === 'POST') {
    const { action, email, password, username } = req.body;

    if (action === 'register') {
      try {
        // Check if user exists
        const existingUser = await User.findOne({ 
          $or: [{ email }, { username }] 
        });
        
        if (existingUser) {
          return res.status(400).json({ 
            success: false, 
            error: 'User already exists' 
          });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);
        
        // Generate unique user ID
        const userID = generateUserID();

        // Create user
        const user = new User({
          email,
          username,
          password: hashedPassword,
          userID,
          isOnline: true
        });

        await user.save();

        // Generate JWT token
        const token = jwt.sign(
          { 
            userId: user._id.toString(),
            userID: user.userID,
            username: user.username,
            email: user.email 
          },
          process.env.JWT_SECRET || 'your-secret-key',
          { expiresIn: '7d' }
        );

        return res.status(201).json({
          success: true,
          token,
          user: {
            id: user._id.toString(),
            userID: user.userID,
            username: user.username,
            email: user.email
          }
        });
      } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({ success: false, error: 'Registration failed' });
      }
    }

    if (action === 'login') {
      try {
        // Find user
        const user = await User.findOne({ 
          $or: [{ email }, { username: email }] 
        }).select('+password');

        if (!user) {
          return res.status(400).json({ 
            success: false, 
            error: 'Invalid credentials' 
          });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
          return res.status(400).json({ 
            success: false, 
            error: 'Invalid credentials' 
          });
        }

        // Update user status
        user.lastActive = new Date();
        user.isOnline = true;
        await user.save();

        // Generate JWT token
        const token = jwt.sign(
          { 
            userId: user._id.toString(),
            userID: user.userID,
            username: user.username,
            email: user.email 
          },
          process.env.JWT_SECRET || 'your-secret-key',
          { expiresIn: '7d' }
        );

        return res.status(200).json({
          success: true,
          token,
          user: {
            id: user._id.toString(),
            userID: user.userID,
            username: user.username,
            email: user.email
          }
        });
      } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ success: false, error: 'Login failed' });
      }
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
