const express = require("express");
const { writeApi } = require("../db/influxClient");
const { Point } = require("@influxdata/influxdb-client");

const router = express.Router();

router.post("/save", (req, res) => {
  const { measurement, fields, tags } = req.body;
  try {
    const point = new Point(measurement).tag(tags).fields(fields);
    writeApi.writePoint(point);
    res.status(200).send("Data saved to InfluxDB");
  } catch (err) {
    res.status(500).send(err.message);
  }
});

module.exports = router;
