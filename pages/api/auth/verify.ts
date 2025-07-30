import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    
    return res.status(200).json({
      success: true,
      user: {
        id: decoded.userId,
        userID: decoded.userID,
        username: decoded.username,
        email: decoded.email
      }
    });
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
}
