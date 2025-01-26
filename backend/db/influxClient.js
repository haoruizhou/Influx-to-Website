const { InfluxDB } = require("@influxdata/influxdb-client");
const influxToken = "";
const influxOrg = "";
const influxBucket = "";

const influxDB = new InfluxDB({
  url: "http://localhost:8086",
  token: influxToken,
});

const writeApi = influxDB.getWriteApi(influxOrg, influxBucket);

module.exports = { influxDB, writeApi };
