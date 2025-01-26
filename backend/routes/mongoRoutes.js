const express = require("express");
const { connectToMongo } = require("../db/mongoClient");

const router = express.Router();

router.post("/save", async (req, res) => {
  const { collection, data } = req.body;
  try {
    const db = await connectToMongo();
    await db.collection(collection).insertOne(data);
    res.status(200).send("Data saved to MongoDB");
  } catch (err) {
    res.status(500).send(err.message);
  }
});

module.exports = router;
