import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function upload() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('learn_vocab');
    const collection = db.collection('vocab');

    // Chặn xóa kho đề - Clear previous only if confirmed to avoid loss
    // await collection.deleteMany({ isSystem: true });

    const vocabDir = path.join(__dirname, '..', 'public', 'vocab');
    const files = fs.readdirSync(vocabDir).filter(f => f.endsWith('.csv'));

    for (const filename of files) {
        const topicName = filename.replace('.csv', '').replace('IELTS_', '').replace(/_/g, ' ');
        const content = fs.readFileSync(path.join(vocabDir, filename), 'utf8');
        const words = content.split('\n').map(line => {
            const p = line.split(',');
            return p.length >= 2 ? { en: p[0].trim(), vi: p[1].trim() } : null;
        }).filter(w => w !== null);

        if (words.length > 0) {
            await collection.updateOne(
                { topic: topicName },
                { $set: { topic: topicName, words: words, isSystem: true, filename: filename } },
                { upsert: true }
            );
            console.log(`Uploaded: ${topicName}`);
        }
    }

    console.log('All 33 topics uploaded successfully!');
  } catch (e) {
    console.error(e);
  } finally {
    await client.close();
  }
}

upload();
