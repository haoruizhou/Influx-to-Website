import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import {
  INFLUX_URL,
  INFLUX_TOKEN,
  INFLUX_ORG,
  INFLUX_BUCKET,
} from '../../backend/db/influxClient.js';

// 1) Fetch distinct sensor names
async function fetchUniqueSensorsFromInflux() {
  const fluxQuery = `
    from(bucket: "${INFLUX_BUCKET}")
      |> range(start: -1d)
      |> filter(fn: (r) => r["_measurement"] == "canBus")
      |> distinct(column: "signalName")
  `;

  const response = await fetch(`${INFLUX_URL}/api/v2/query?org=${INFLUX_ORG}`, {
    method: 'POST',
    headers: {
      Authorization: `Token ${INFLUX_TOKEN}`,
      'Content-Type': 'application/vnd.flux',
      Accept: 'application/csv'
    },
    body: fluxQuery
  });

  if (!response.ok) {
    throw new Error(`InfluxDB query error: ${response.status} ${response.statusText}`);
  }

  const csvData = await response.text();
  return parseDistinctCsv(csvData);
}

// 2) Fetch time series data for a sensor over the last "timeRangeSec" seconds
async function fetchSensorData(signalName, timeRangeSec) {
  const fluxQuery = `
    from(bucket: "${INFLUX_BUCKET}")
      |> range(start: -${timeRangeSec}s)
      |> filter(fn: (r) => r["_measurement"] == "canBus")
      |> filter(fn: (r) => r["signalName"] == "${signalName}")
      |> filter(fn: (r) => r["_field"] == "sensorReading")
      |> aggregateWindow(every: 1s, fn: mean, createEmpty: false)
      |> yield(name: "mean")
  `;

  const response = await fetch(`${INFLUX_URL}/api/v2/query?org=${INFLUX_ORG}`, {
    method: 'POST',
    headers: {
      Authorization: `Token ${INFLUX_TOKEN}`,
      'Content-Type': 'application/vnd.flux',
      Accept: 'application/csv'
    },
    body: fluxQuery
  });

  if (!response.ok) {
    throw new Error(`InfluxDB query error: ${response.status} ${response.statusText}`);
  }

  const csvData = await response.text();
  return parseSensorCsv(csvData);
}

/**
 * Parse the CSV from distinct(column: "signalName").
 */
function parseDistinctCsv(csvData) {
  const lines = csvData.trim().split('\n');
  if (lines.length < 2) return [];
  const header = lines[0].split(',').map((cell) => cell.trim());
  const valueIndex = header.indexOf('_value');
  if (valueIndex < 0) return [];

  const results = [];
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',').map((cell) => cell.trim());
    if (row.length === header.length) {
      results.push(row[valueIndex]);
    }
  }
  return results;
}

/**
 * Parse CSV from a time series query:
 *   Converts _time and _value columns into { time, value }.
 */
function parseSensorCsv(csvData) {
  const lines = csvData.trim().split('\n');
  if (lines.length < 2) return [];
  const header = lines[0].split(',').map((cell) => cell.trim());
  const timeIndex = header.indexOf('_time');
  const valueIndex = header.indexOf('_value');
  if (timeIndex < 0 || valueIndex < 0) {
    console.error('Missing _time or _value in CSV header:', header);
    return [];
  }

  const results = [];
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',').map((cell) => cell.trim());
    if (row.length === header.length) {
      const timeString = row[timeIndex];
      const valueString = row[valueIndex];
      const numericValue = parseFloat(valueString);
      if (!isNaN(numericValue)) {
        results.push({
          time: new Date(timeString).getTime(),
          value: numericValue,
        });
      }
    }
  }
  return results;
}

// OverlayChart uses each overlay sensor's assigned color.
const OverlayChart = ({ sensors, timeRangeSec }) => {
  const [data, setData] = useState([]);

  useEffect(() => {
    async function fetchOverlayData() {
      try {
        const sensorDataArray = await Promise.all(
            sensors.map((sensor) => fetchSensorData(sensor.sensorName, timeRangeSec))
        );
        if (sensorDataArray.length === 0) return;
        const mergedData = sensorDataArray[0].map((point, index) => {
          let mergedPoint = { time: point.time };
          sensors.forEach((sensor, idx) => {
            mergedPoint[sensor.sensorName] = sensorDataArray[idx][index]?.value || null;
          });
          return mergedPoint;
        });
        setData(mergedData);
      } catch (error) {
        console.error("Error fetching overlay data:", error);
      }
    }

    if (sensors.length > 0) {
      fetchOverlayData();
      const intervalId = setInterval(fetchOverlayData, 1000);
      return () => clearInterval(intervalId);
    }
  }, [sensors, timeRangeSec]);

  return (
      <Card style={{ width: '450px', marginBottom: '1rem' }}>
        <CardHeader>
          <CardTitle>Sensor Overlay</CardTitle>
        </CardHeader>
        <CardContent>
          <LineChart width={400} height={300} data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
                dataKey="time"
                tickFormatter={(unixTime) => new Date(unixTime).toLocaleTimeString()}
            />
            <YAxis label={{ value: 'Value', angle: -90, position: 'insideLeft' }} />
            <Tooltip
                labelFormatter={(unixTime) => new Date(unixTime).toLocaleString()}
                formatter={(value) => [value, '']}
            />
            <Legend />
            {sensors.map((sensor) => (
                <Line
                    key={sensor.sensorName}
                    type="monotone"
                    dataKey={sensor.sensorName}
                    stroke={sensor.color}
                    dot={false}
                    isAnimationActive={false}
                />
            ))}
          </LineChart>
        </CardContent>
      </Card>
  );
};

const DynamicCharts = () => {
  // Chart and sensor states
  const [sensorCharts, setSensorCharts] = useState([]);
  const [availableSensors, setAvailableSensors] = useState([]);
  const [overlaySensors, setOverlaySensors] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [fetchError, setFetchError] = useState(null);
  const [timeRangeSec, setTimeRangeSec] = useState(60);
  // Preset string state for saving/loading configurations
  const [presetString, setPresetString] = useState('');

  const sensorChartsRef = useRef(sensorCharts);
  const timeRangeSecRef = useRef(timeRangeSec);

  // Color palette for overlay only
  const colorPalette = [
    '#2563eb',
    '#10b981',
    '#f97316',
    '#ef4444',
    '#eab308',
    '#8b5cf6',
    '#ec4899',
    '#14b8a6',
    '#f43f5e',
    '#7c3aed',
  ];
  const [colorIndex, setColorIndex] = useState(0);

  // Fetch available sensors on mount (store only sensorName)
  useEffect(() => {
    async function getSensors() {
      try {
        const sensorNames = await fetchUniqueSensorsFromInflux();
        const sensorObjects = sensorNames.map((name) => ({ sensorName: name }));
        setAvailableSensors(sensorObjects);
      } catch (error) {
        console.error('Error fetching sensors:', error);
        setFetchError(error.message);
      }
    }
    getSensors();
  }, []);

  useEffect(() => {
    sensorChartsRef.current = sensorCharts;
  }, [sensorCharts]);

  useEffect(() => {
    timeRangeSecRef.current = timeRangeSec;
  }, [timeRangeSec]);

  // Poll for updates on individual sensor charts
  useEffect(() => {
    const intervalId = setInterval(async () => {
      const currentCharts = sensorChartsRef.current;
      const currentRange = timeRangeSecRef.current;
      if (currentCharts.length === 0) return;
      try {
        const updatedCharts = await Promise.all(
            currentCharts.map(async (chart) => {
              const dataPoints = await fetchSensorData(chart.sensorName, currentRange);
              return { ...chart, data: dataPoints };
            })
        );
        setSensorCharts(updatedCharts);
      } catch (err) {
        console.error('Error polling sensor data:', err);
      }
    }, 1000);
    return () => clearInterval(intervalId);
  }, []);

  // Toggle sensor selection for overlay
  const toggleOverlaySensor = (sensor) => {
    setOverlaySensors((prev) => {
      const existing = prev.find((s) => s.sensorName === sensor.sensorName);
      if (existing) {
        return prev.filter((s) => s.sensorName !== sensor.sensorName);
      } else {
        const color = colorPalette[colorIndex % colorPalette.length];
        setColorIndex((prevIndex) => prevIndex + 1);
        const overlaySensor = { sensorName: sensor.sensorName, color };
        return [...prev, overlaySensor];
      }
    });
  };

  // Add a new individual chart (always with default color)
  const addChart = async (sensorConfig) => {
    try {
      const dataPoints = await fetchSensorData(sensorConfig.sensorName, timeRangeSec);
      const newChart = {
        sensorName: sensorConfig.sensorName,
        color: '#2563eb',
        id: Date.now() + Math.random(),
        data: dataPoints,
      };
      setSensorCharts((prev) => [...prev, newChart]);
    } catch (err) {
      console.error('Error fetching sensor data:', err);
    }
  };

  // Remove an individual chart
  const removeChart = (chartId) => {
    setSensorCharts((prev) => prev.filter((chart) => chart.id !== chartId));
  };

  // Preset export: create an object with current settings and encode it as a base64 string.
  const exportPreset = () => {
    const preset = {
      timeRangeSec,
      individualSensors: sensorCharts.map((chart) => chart.sensorName),
      overlaySensors, // includes sensorName and assigned color
    };
    return btoa(JSON.stringify(preset));
  };

  // Preset import: decode the preset string and apply the configuration.
  const importPreset = (presetStr) => {
    try {
      const decoded = atob(presetStr);
      const preset = JSON.parse(decoded);
      setTimeRangeSec(preset.timeRangeSec);
      const newSensorCharts = preset.individualSensors.map((sensorName) => ({
        sensorName,
        color: '#2563eb',
        id: Date.now() + Math.random(),
        data: [],
      }));
      setSensorCharts(newSensorCharts);
      setOverlaySensors(preset.overlaySensors);
    } catch (err) {
      console.error("Error importing preset:", err);
    }
  };

  // Filter available sensors by search term.
  const filteredSensors = availableSensors
      .filter((sensor) =>
          sensor.sensorName.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .slice(0, 200);

  return (
      <div style={{ padding: '1rem' }}>
        {/* Preset Manager UI */}
        <div style={{ marginBottom: '1rem' }}>
          <h3>Preset Manager</h3>
          <textarea
              value={presetString}
              onChange={(e) => setPresetString(e.target.value)}
              placeholder="Preset code will appear here after saving, or paste code here to load a preset"
              rows={3}
              style={{ width: '100%', marginBottom: '0.5rem' }}
          />
          <div>
            <button
                onClick={() => {
                  const code = exportPreset();
                  setPresetString(code);
                  alert("Preset saved! Code is in the text area.");
                }}
            >
              Save Preset
            </button>
            <button
                onClick={() => {
                  importPreset(presetString);
                  alert("Preset loaded!");
                }}
                style={{ marginLeft: '0.5rem' }}
            >
              Load Preset
            </button>
          </div>
        </div>

        <div style={{ display: 'flex' }}>
          {/* Sidebar */}
          <div
              style={{
                width: '250px',
                marginRight: '1rem',
                borderRight: '1px solid #ccc',
                paddingRight: '1rem',
                maxHeight: '80vh',
                overflowY: 'auto',
              }}
          >
            <h2>Available Sensors</h2>
            {fetchError && (
                <div style={{ color: 'red', marginBottom: '1rem' }}>
                  Failed to fetch sensors: {fetchError}
                </div>
            )}
            <input
                type="text"
                placeholder="Search sensors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', marginBottom: '0.5rem' }}
            />
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {filteredSensors.map((sensor, index) => (
                  <li
                      key={index}
                      style={{
                        marginBottom: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                  >
                    <span>{sensor.sensorName}</span>
                    <button
                        onClick={() => addChart(sensor)}
                        style={{
                          marginLeft: '0.5rem',
                          padding: '0.25rem 0.5rem',
                          backgroundColor: '#2563eb',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                    >
                      Add Chart
                    </button>
                    <button
                        onClick={() => toggleOverlaySensor(sensor)}
                        style={{
                          marginLeft: '0.5rem',
                          padding: '0.25rem 0.5rem',
                          backgroundColor: overlaySensors.find((s) => s.sensorName === sensor.sensorName)
                              ? '#10b981'
                              : '#6b7280',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                    >
                      {overlaySensors.find((s) => s.sensorName === sensor.sensorName)
                          ? 'Remove Overlay'
                          : 'Add Overlay'}
                    </button>
                  </li>
              ))}
            </ul>
          </div>

          {/* Main Area */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ marginRight: '0.5rem' }}>Time Range (seconds):</label>
              <input
                  type="number"
                  value={timeRangeSec}
                  onChange={(e) => setTimeRangeSec(Number(e.target.value))}
                  style={{ width: '100px' }}
              />
            </div>

            {overlaySensors.length > 0 && (
                <OverlayChart sensors={overlaySensors} timeRangeSec={timeRangeSec} />
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
              {sensorCharts.map((chart) => (
                  <Card key={chart.id} style={{ width: '420px' }}>
                    <CardHeader
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <CardTitle>{chart.sensorName}</CardTitle>
                      <button
                          onClick={() => removeChart(chart.id)}
                          style={{
                            marginLeft: '0.5rem',
                            padding: '0.25rem 0.5rem',
                            backgroundColor: '#ef4444',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                      >
                        Remove Chart
                      </button>
                    </CardHeader>
                    <CardContent>
                      <LineChart width={400} height={200} data={chart.data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                            dataKey="time"
                            tickFormatter={(unixTime) => new Date(unixTime).toLocaleTimeString()}
                        />
                        <YAxis label={{ value: 'Value', angle: -90, position: 'insideLeft' }} />
                        <Tooltip
                            labelFormatter={(unixTime) => new Date(unixTime).toLocaleString()}
                            formatter={(value) => [value, '']}
                        />
                        <Line
                            type="monotone"
                            dataKey="value"
                            stroke={chart.color}
                            dot={false}
                            isAnimationActive={false}
                        />
                      </LineChart>
                    </CardContent>
                  </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
  );
};

export default DynamicCharts;