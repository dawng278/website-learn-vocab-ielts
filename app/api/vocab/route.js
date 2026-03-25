import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('learn_vocab');
    
    // Fetch all system-pinned topics from MongoDB
    const result = await db.collection('vocab').find({}).toArray();
    
    // Sort topics for consistency
    const topics = result.map(doc => ({
      name: doc.topic,
      words: doc.words, // We can also return words directly to save frontend fetches
      isSystem: doc.isSystem || true,
      filename: doc.filename
    })).sort((a,b) => a.name.localeCompare(b.name));

    return NextResponse.json({ topics });
  } catch (error) {
    console.error('MongoDB API Error:', error);
    // Fallback? or just error
    return NextResponse.json({ topics: [], error: 'Database connection failed' }, { status: 500 });
  }
}
