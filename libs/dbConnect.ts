// /lib/dbConnect.js
import mongoose from "mongoose";
mongoose.set("strictQuery", true);
/** 
Source : 
https://github.com/vercel/next.js/blob/canary/examples/with-mongodb-mongoose/utils/dbConnect.js 
**/

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    "Please define the MONGODB_URI environment variable inside .env.local"
  );
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
      return mongoose;
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

export default dbConnect;


// Challenge Schema
const challengeSchema = new mongoose.Schema({
  title: String,
  description: String,
  type: { type: String, enum: ['solo', 'versus', 'daily'] },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'] },
  points: Number,
  questions: [{}], // Challenge-specific data
  timeLimit: Number, // in seconds
  isActive: { type: Boolean, default: true }
});

// User Challenge Stats Schema
const userStatsSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  totalScore: { type: Number, default: 0 },
  challengesCompleted: { type: Number, default: 0 },
  rank: { type: String, default: 'Beginner' },
  achievements: [String],
  lastActive: Date
});

// Challenge Completion Schema
const completionSchema = new mongoose.Schema({
  userId: String,
  challengeId: String,
  score: Number,
  completionTime: Number,
  answers: [{}],
  completedAt: { type: Date, default: Date.now }
});
