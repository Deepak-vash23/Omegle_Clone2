// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "../../../libs/dbConnect";
import { RtcTokenBuilder, RtcRole } from "agora-access-token";
import { RtmTokenBuilder, RtmRole } from "agora-access-token";
import Room from "../../../models/Room";

type Room = {
  status: String;
};

type ResponseData = Room[] | string;

function getRtmToken(userId: string) {
  const appID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;
  const appCertificate = process.env.AGORA_APP_CERT!;
  const account = userId;
  const expirationTimeInSeconds = 3600;
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;
  const token = RtmTokenBuilder.buildToken(
    appID,
    appCertificate,
    account,
    RtmRole.Rtm_User,
    privilegeExpiredTs
  );
  return token;
}

function getRtcToken(roomId: string, userId: string) {
  const appID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;
  const appCertificate = process.env.AGORA_APP_CERT!;
  const channelName = roomId;
  const account = userId;
  const role = RtcRole.PUBLISHER;
  const expirationTimeInSeconds = 3600;
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

  const token = RtcTokenBuilder.buildTokenWithAccount(
    appID,
    appCertificate,
    channelName,
    account,
    role,
    privilegeExpiredTs
  );

  return token;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method, query } = req;
  const userId = query.userId as string;

  // Validate userId first
  if (!userId) {
    return res.status(400).json({ 
      error: "User ID is required",
      success: false 
    });
  }

  await dbConnect();

  try {
    switch (method) {
      case "GET":
        console.log(`🔍 Looking for rooms for user: ${userId}`);
        
        const rooms = await Room.find({ 
          status: "waiting",
          createdBy: { $ne: userId }
        }).sort({ createdAt: 1 });

        console.log(`📊 Found ${rooms.length} waiting rooms`);

        if (rooms.length > 0) {
          const selectedRoom = rooms[0];
          
          // Update room status
          await Room.findByIdAndUpdate(selectedRoom._id, {
            status: "chatting",
            participants: [selectedRoom.createdBy, userId]
          });

          console.log(`✅ User ${userId} joined room ${selectedRoom._id}`);
          
          // ALWAYS send response
          return res.status(200).json({
            success: true,
            rooms: [selectedRoom],
            rtcToken: getRtcToken(selectedRoom._id.toString(), userId),
            rtmToken: getRtmToken(userId),
          });
        } else {
          console.log(`❌ No rooms found for user ${userId}`);
          
          // ALWAYS send response even when no rooms found
          return res.status(200).json({ 
            success: true,
            rooms: [], 
            rtcToken: "", 
            rtmToken: "",
            message: "No waiting rooms available"
          });
        }

      case "POST":
        console.log(`🆕 Creating room for user: ${userId}`);
        
        const room = await Room.create({
          status: "waiting",
          createdBy: userId,
          participants: [userId]
        });

        console.log(`✅ Created room ${room._id}`);

        // ALWAYS send response
        return res.status(200).json({
          success: true,
          room,
          rtcToken: getRtcToken(room._id.toString(), userId),
          rtmToken: getRtmToken(userId),
        });

      default:
        // Handle unsupported methods
        return res.status(405).json({ 
          error: "Method not allowed",
          success: false 
        });
    }
  } catch (error) {
    console.error("API error:", error);
    
    // ALWAYS send error response
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : String(error),
      success: false 
    });
  }
}

