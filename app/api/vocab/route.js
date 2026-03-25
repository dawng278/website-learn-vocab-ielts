import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const vocabDir = path.join(process.cwd(), 'public', 'vocab');
    const files = fs.readdirSync(vocabDir).filter(f => f.endsWith('.csv'));
    
    // Clean up names: IELTS_Education.csv -> Education
    const topics = files.map(filename => ({
      name: filename.replace('.csv', '').replace('IELTS_', '').replace(/_/g, ' '),
      filename: filename
    }));

    return NextResponse.json({ topics });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ topics: [] }, { status: 500 });
  }
}
