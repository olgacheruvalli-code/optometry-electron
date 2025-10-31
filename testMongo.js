const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = "mongodb+srv://opto_app:Opto2025aa@cluster0.6dbr4bo.mongodb.net/?appName=Cluster0";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  console.log("🚀 Starting MongoDB connection test...");
  try {
    await client.connect();
    console.log("✅ Connected to cluster, now pinging admin DB...");
    await client.db("admin").command({ ping: 1 });
    console.log("✅ Pinged your deployment. You successfully connected to MongoDB!");
  } catch (err) {
    console.error("❌ Connection error:", err);
  } finally {
    await client.close();
    console.log("🔒 Connection closed.");
  }
}

run().catch((err) => console.error("💥 Unexpected error:", err));


