import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectToMongo } from "./db/mongoClient.js";
dotenv.config();

const app = express();
app.use(cors({ origin: "http://localhost:5173" })); // Replace with your frontend's URL
app.use(express.json());

app.post("/track/save", async (req, res) => {
  try {
    const db = await connectToMongo();
    const trackCollection = db.collection("tracks");

    // Save the track points (overwrite the existing track with the same name)
    const result = await trackCollection.updateOne(
      { name: req.body.name }, // Track identifier
      { $set: { points: req.body.points } },
      { upsert: true }
    );

    res.json({ success: true, result });
  } catch (error) {
    console.error("Error saving track points:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/track/load/:name", async (req, res) => {
  try {
    const db = await connectToMongo();
    const trackCollection = db.collection("tracks");

    const track = await trackCollection.findOne({ name: req.params.name });
    if (!track) {
      return res.status(404).json({ success: false, message: "Track not found" });
    }

    res.json({ success: true, points: track.points });
  } catch (error) {
    console.error("Error loading track points:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
