import { NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  let topics = [];
  let source = 'unknown';

  try {
    // 1. Try to fetch from MongoDB
    if (process.env.NEXT_PHASE !== 'phase-production-build') {
        const client = await clientPromise;
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

  // 2. Fallback to local all_topics.json if MongoDB is empty or fails
  if (topics.length === 0) {
    try {
        const filePath = path.join(process.cwd(), 'all_topics.json');
        if (fs.existsSync(filePath)) {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const localData = JSON.parse(fileContent);
            topics = localData.map(item => ({
                name: item.topic,
                words: item.words,
                isSystem: true,
                filename: item.filename
            }));
            source = 'local_file';
        }
    } catch (err) {
        console.error('❌ Local file fallback failed:', err.message);
    }
  }

  // Final check and sort
  topics = topics.sort((a,b) => a.name.localeCompare(b.name));

  return NextResponse.json({ topics, source });
}
