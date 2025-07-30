import { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../libs/dbConnect';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { RtcTokenBuilder, RtcRole, RtmTokenBuilder, RtmRole } from 'agora-access-token';

// User model for tracking online status
const userSchema = new mongoose.Schema({
  userID: String,
  username: String,
  isOnline: Boolean,
  isSearching: Boolean,
  currentMatch: String, // Store matched user's ID
  lastActive: Date
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

function generateTokens(channelName: string, userId: string) {
  const appID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;
  const appCertificate = process.env.AGORA_APP_CERT!;
  const expirationTimeInSeconds = 3600;
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

  const rtcToken = RtcTokenBuilder.buildTokenWithAccount(
    appID,
    appCertificate,
    channelName,
    userId,
    RtcRole.PUBLISHER,
    privilegeExpiredTs
  );

  const rtmToken = RtmTokenBuilder.buildToken(
    appID,
    appCertificate,
    userId,
    RtmRole.Rtm_User,
    privilegeExpiredTs
  );

  return { rtcToken, rtmToken };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await dbConnect();

  try {
    // Get user from token
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
    const currentUserId = decoded.userID;

    console.log(`🔄 Direct matching request from user: ${currentUserId}`);

    // Find other users who are online and searching (but not already matched)
    const availableUsers = await User.find({
      userID: { $ne: currentUserId }, // Not the current user
      isOnline: true,
      isSearching: true,
      currentMatch: { $exists: false } // Not already matched
    }).sort({ lastActive: -1 }); // Most recently active first

    console.log(`👥 Found ${availableUsers.length} available users for matching`);

    if (availableUsers.length > 0) {
      // Random selection from available users
      const randomIndex = Math.floor(Math.random() * availableUsers.length);
      const matchedUser = availableUsers[randomIndex];
      
      console.log(`🎯 Matching ${currentUserId} with ${matchedUser.userID}`);

      // Create a channel name using both userIDs (sorted for consistency)
      const channelName = [currentUserId, matchedUser.userID].sort().join('_');
      
      // Update both users' status
      await User.findOneAndUpdate(
        { userID: currentUserId },
        { 
          currentMatch: matchedUser.userID,
          isSearching: false 
        }
      );
      
      await User.findOneAndUpdate(
        { userID: matchedUser.userID },
        { 
          currentMatch: currentUserId,
          isSearching: false 
        }
      );

      // Generate tokens for the shared channel
      const tokens = generateTokens(channelName, currentUserId);

      return res.status(200).json({
        success: true,
        matched: true,
        matchedUser: {
          userID: matchedUser.userID,
          username: matchedUser.username
        },
        channelName,
        rtcToken: tokens.rtcToken,
        rtmToken: tokens.rtmToken,
        message: `Matched with ${matchedUser.username}!`
      });
    }

    // No available users, mark as searching
    await User.findOneAndUpdate(
      { userID: currentUserId },
      { 
        isSearching: true,
        currentMatch: null 
      }
    );

    console.log(`⏳ No match found, user ${currentUserId} is now searching...`);

    return res.status(200).json({
      success: true,
      matched: false,
      message: "Searching for someone to chat with...",
      channelName: null,
      rtcToken: null,
      rtmToken: null
    });

  } catch (error) {
    console.error('Direct matching error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Matching failed' 
    });
  }
}
