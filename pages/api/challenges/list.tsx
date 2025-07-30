import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Return available challenges
    const challenges = [
      {
        id: 1,
        title: "Quick Math",
        description: "Solve 10 math problems as fast as possible",
        type: "solo",
        difficulty: "easy",
        points: 50
      },
      // More challenges...
    ];
    
    return res.json({ success: true, challenges });
  }
}
