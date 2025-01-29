const express = require("express");
const { connectToMongo } = require("../db/mongoClient");

const router = express.Router();

// Save track points to MongoDB
router.post("/save", async (req, res) => {
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

// Load track points from MongoDB
router.get("/load/:name", async (req, res) => {
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

export default router;
