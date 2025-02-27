import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
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
 *   Looks for _time and _value columns, converting them into { time, value }.
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

const DynamicCharts = () => {
  // Chart configs
  const [sensorCharts, setSensorCharts] = useState([]);
  // List of available sensors
  const [availableSensors, setAvailableSensors] = useState([]);
  // Sidebar search
  const [searchTerm, setSearchTerm] = useState('');
  // Error handling
  const [fetchError, setFetchError] = useState(null);

  // The universal time range in seconds (default 60 = last 1 minute)
  const [timeRangeSec, setTimeRangeSec] = useState(60);

  // --- 1) Keep refs for sensorCharts & timeRangeSec to avoid multiple intervals
  const sensorChartsRef = useRef(sensorCharts);
  const timeRangeSecRef = useRef(timeRangeSec);

  useEffect(() => {
    sensorChartsRef.current = sensorCharts;
  }, [sensorCharts]);

  useEffect(() => {
    timeRangeSecRef.current = timeRangeSec;
  }, [timeRangeSec]);

  // --- 2) Fetch distinct sensor names on mount
  useEffect(() => {
    async function getSensors() {
      try {
        const sensorNames = await fetchUniqueSensorsFromInflux();
        const sensorObjects = sensorNames.map((name) => ({
          sensorName: name,
          color: '#2563eb',
        }));
        setAvailableSensors(sensorObjects);
      } catch (error) {
        console.error('Error fetching sensors:', error);
        setFetchError(error.message);
      }
    }
    getSensors();
  }, []);

  // --- 3) Poll for new data every second
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
  }, []); // run once on mount

  // Called when user selects "Add Chart"
  const addChart = async (sensorConfig) => {
    try {
      const dataPoints = await fetchSensorData(sensorConfig.sensorName, timeRangeSec);
      const newChart = {
        ...sensorConfig,
        id: Date.now(),
        data: dataPoints,
      };
      setSensorCharts((prev) => [...prev, newChart]);
    } catch (err) {
      console.error('Error fetching sensor data:', err);
    }
  };

  // Filter the list of sensors by searchTerm, limit to 200
  const filteredSensors = availableSensors
      .filter((sensor) =>
          sensor.sensorName.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .slice(0, 200);

  return (
      <div style={{ display: 'flex', padding: '1rem' }}>
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

          {/* Search bar */}
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
                        backgroundColor: sensor.color,
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                  >
                    Add Chart
                  </button>
                </li>
            ))}
          </ul>
        </div>

        {/* Main area: Time Range Control + Charts */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Universal time range selector */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ marginRight: '0.5rem' }}>Time Range (seconds):</label>
            <input
                type="number"
                value={timeRangeSec}
                onChange={(e) => setTimeRangeSec(Number(e.target.value))}
                style={{ width: '100px' }}
            />
          </div>

          {/* Charts container */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
            {sensorCharts.map((chart) => (
                <Card key={chart.id} style={{ width: '420px' }}>
                  <CardHeader>
                    <CardTitle>{chart.sensorName}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <LineChart width={400} height={200} data={chart.data}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                          dataKey="time"
                          tickFormatter={(unixTime) =>
                              new Date(unixTime).toLocaleTimeString()
                          }
                      />
                      <YAxis
                          label={{ value: 'Value', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip
                          labelFormatter={(unixTime) =>
                              new Date(unixTime).toLocaleString()
                          }
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
  );
};

export default DynamicCharts;