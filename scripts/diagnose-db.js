import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';

// Manual loading of .env.local
let uri;
try {
  const envContent = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf-8');
  const match = envContent.match(/^MONGODB_URI=(.*)$/m);
  if (match) {
      uri = match[1].trim();
  }
} catch (e) {
  console.log('❌ Could not read .env.local');
}

if (!uri) {
  console.log('❌ MONGODB_URI is not set in .env.local');
  process.exit(1);
}

console.log('Connecting to MongoDB...');

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log('✅ Connected successfully to MongoDB');
    
    // Get database name from URI or default
    let dbName = 'learn_vocab';
    const uriMatch = uri.match(/.+\/(.+)\?/);
    if (uriMatch) {
        dbName = uriMatch[1];
    }
    
    console.log(`Using database: ${dbName}`);
    
    const db = client.db(dbName);
    const collections = await db.listCollections().toArray();
    
    if (collections.length === 0) {
      console.log('❌ No collections found in this database!');
      // Check other databases
      const admin = client.db().admin();
      const dbs = await admin.listDatabases();
      console.log('Available databases:');
      dbs.databases.forEach(d => console.log(` - ${d.name}`));
    } else {
      console.log('Collections found:');
      for (const col of collections) {
        const count = await db.collection(col.name).countDocuments();
        console.log(` - ${col.name}: ${count} documents`);
        
        if (count > 0) {
            const sample = await db.collection(col.name).findOne();
            console.log(`   Sample document keys: ${Object.keys(sample).join(', ')}`);
        }
      }
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.close();
  }
}

run();
