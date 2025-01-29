import { MongoClient } from "mongodb";
import dotenv from "dotenv";

// Load .env variables
dotenv.config();

const uri = process.env.DATABASE_URI;

if (!uri) {
  throw new Error("DATABASE_URI is not defined. Check your .env file.");
}

const client = new MongoClient(uri);

export const connectToMongo = async () => {
  try {
    await client.connect(); // Connect to MongoDB
    console.log("Connecting to MongoDB with URI:", process.env.DATABASE_URI);
    const db = client.db(); // Return the database instance

    // Test the connection by listing databases
    const databasesList = await client.db().admin().listDatabases();
    console.log("Databases:");
    databasesList.databases.forEach(db => console.log(` - ${db.name}`));

    return db;
  } catch (error) {
    console.error("Error connecting to MongoDB:", error.message);
    throw error;
  }
};
