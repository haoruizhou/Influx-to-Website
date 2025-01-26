import express from "express";
import { connectToMongo } from "./db/mongoClient.js"; // Adjust path as needed

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for JSON parsing
app.use(express.json());

// Test MongoDB route
app.get("/mongo/test", async (req, res) => {
  try {
    const db = await connectToMongo();
    const collections = await db.listCollections().toArray();
    res.json({ success: true, collections });
  } catch (error) {
    console.error("Error in /mongo/test:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
