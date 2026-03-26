import { NextResponse } from 'next/server';
import dbConnect from '../../../lib/db';
import topicsData from '../../../all_topics.json';

export const dynamic = 'force-dynamic';

export async function GET() {
  let topics = [];
  let source = 'unknown';

  try {
    // 1. Try to fetch from MongoDB
    if (process.env.NEXT_PHASE !== 'phase-production-build') {
        const client = await dbConnect();
        const db = client.db();
        const result = await db.collection('vocab').find({}).toArray();
        
        if (result && result.length > 0) {
            topics = result.map(doc => ({
                name: doc.topic,
                words: doc.words, 
                isSystem: true,
                filename: doc.filename
            }));
            source = 'mongodb';
        }
    }
  } catch (error) {
    console.error('⚠️ MongoDB Fetch Failed, falling back to local file:', error.message);
  }

  // 2. Fallback to bundled topicsData if MongoDB is empty or fails
  if (topics.length === 0) {
    try {
        const localData = Array.isArray(topicsData) ? topicsData : (topicsData.default || []);
        topics = localData.map(item => ({
            name: item.topic || item.name,
            words: item.words,
            isSystem: true,
            filename: item.filename
        }));
        source = 'bundled_json';
    } catch (err) {
        console.error('❌ JSON fallback failed:', err.message);
    }
  }

  // Final check and sort
  topics = topics.sort((a,b) => a.name.localeCompare(b.name));

  return NextResponse.json({ topics, source });
}
