import { NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Prevent building phase from trying to connect
    if (process.env.NEXT_PHASE === 'phase-production-build') {
        return NextResponse.json({ topics: [] });
    }
    
    const client = await clientPromise;
    const db = client.db('learn_vocab');
    
    // Fetch all system-pinned topics from MongoDB
    const result = await db.collection('vocab').find({}).toArray();
    
    // Sort topics for consistency
    const topics = result.map(doc => ({
      name: doc.topic,
      words: doc.words, 
      isSystem: doc.isSystem || true,
      filename: doc.filename
    })).sort((a,b) => a.name.localeCompare(b.name));

    return NextResponse.json({ topics });
  } catch (error) {
    console.error('MongoDB API Error:', error);
    return NextResponse.json({ topics: [], error: 'Database connection failed' }, { status: 500 });
  }
}
