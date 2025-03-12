import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

let client = null;
let db = null;

export const connectToMongo = async () => {
  // Return existing connection if available
  if (db) return db;
  
  const uri = process.env.DATABASE_URI || process.env.DATABASE_URL;
  if (!uri) {
    throw new Error("DATABASE_URI is not defined. Check your .env file.");
  }
  
  try {
    console.log("Connecting to MongoDB...");
    client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000
    });
    
    await client.connect();
    console.log("Successfully connected to MongoDB!");
    
    db = client.db();
    return db;
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error;
  }
};

// Initialize connection when the module is loaded
connectToMongo().catch(err => console.error("Initial MongoDB connection failed:", err));