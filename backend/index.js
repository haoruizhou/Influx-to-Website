import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

import authRoutes from "./api/auth.js";
import adminRoutes from "./routes/admin.routes.js";
import { authenticateToken } from "./middleware/auth.js";
// Removed: import { connectToMongo } from "./db/mongoClient.js";

dotenv.config();

const mongoURI = process.env.DATABASE_URI || process.env.DATABASE_URL;


// 1) Connect Mongoose
mongoose
  .connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Mongoose connected to MongoDB"))
  .catch((err) => console.error("Mongoose connection error:", err));


  console.log("Server DB URI:", process.env.DATABASE_URI);


const app = express();
app.use(cors({ origin: "http://localhost:5173" })); // Replace with your frontend URL
app.use(express.json());

// 2) Setup routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);

// 3) Protected routes (example using direct collection access)
app.post("/track/save", authenticateToken, async (req, res) => {
  try {
    // Use the Mongoose connection's underlying native driver to get a collection:
    const trackCollection = mongoose.connection.db.collection("tracks");

    // Optional: Add user info to the track
    const trackWithUser = {
      ...req.body,
      userId: req.user.userId, // from the token
      updatedAt: new Date(),
    };

    // Save the track points (overwrite the existing track with the same name)
    const result = await trackCollection.updateOne(
      { name: req.body.name },
      { $set: { points: req.body.points } },
      { upsert: true }
    );

    res.json({ success: true, result });
  } catch (error) {
    console.error("Error saving track points:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/track/load/:name", authenticateToken, async (req, res) => {
  try {
    const trackCollection = mongoose.connection.db.collection("tracks");

    const track = await trackCollection.findOne({ name: req.params.name });
    if (!track) {
      return res.status(404).json({ success: false, message: "Track not found" });
    }

    // Optional: Check if user is authorized to access this track
    // if (track.userId && track.userId !== req.user.userId && req.user.role !== 'admin') {
    //   return res.status(403).json({ success: false, message: "Not authorized to access this track" });
    // }

    res.json({ success: true, points: track.points });
  } catch (error) {
    console.error("Error loading track points:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4) Start the server once Mongoose is connected
const PORT = process.env.PORT || 3000;
mongoose.connection.once("open", () => {
  console.log("Mongoose connection is open. Starting server...");
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
