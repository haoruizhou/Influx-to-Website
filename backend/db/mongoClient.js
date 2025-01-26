import { MongoClient } from "mongodb";
import dotenv from "dotenv";

// Load .env variables
dotenv.config();

const uri = process.env.DATABASE_URI; // This should come from your .env file

if (!uri) {
  throw new Error("DATABASE_URI is not defined. Check your .env file.");
}

const client = new MongoClient(uri);

export const connectToMongo = async () => {
  try {
    await client.connect(); // Connect to MongoDB
    console.log("Connecting to MongoDB with URI:", process.env.DATABASE_URI);
    return client.db(); // Return the database instance
  } catch (error) {
    console.error("Error connecting to MongoDB:", error.message);
    throw error;
  }
};
