// Use dynamic import to avoid build-time resolution issues on some platforms
let clientPromise;

export async function getClientPromise() {
  if (clientPromise) return clientPromise;

  try {
    const { MongoClient } = await import('mongodb');
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const options = {};
    const client = new MongoClient(uri, options);
    clientPromise = client.connect();
    return clientPromise;
  } catch (err) {
    console.error("MongoDB direct connection failed:", err.message);
    throw err;
  }
}

export default async function dbConnect() {
    return await getClientPromise();
}
