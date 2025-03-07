// influxClient.js
import { InfluxDB } from "@influxdata/influxdb-client";

export const INFLUX_TOKEN = "S7_Lv0ga61bwJ26sQ__j9aFR78ogF0t70K_mjdznrCB7bOfjl4fagr1Pl8Cz6RUFdqjNZwv7wa8HCVfcSruLGA==";
export const INFLUX_ORG = "WFR";
export const INFLUX_BUCKET = "ourCar";
export const INFLUX_URL = "http://35.183.158.105:8086";


export const influxDB = new InfluxDB({
  url: INFLUX_URL,
  token: INFLUX_TOKEN,
});

export const writeApi = influxDB.getWriteApi(INFLUX_ORG, INFLUX_BUCKET);


