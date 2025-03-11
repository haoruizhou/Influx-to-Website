"use client";
import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { INFLUX_URL, INFLUX_TOKEN, INFLUX_ORG, INFLUX_BUCKET } from "../../backend/db/influxClient.js";

// InfluxDB Helper Functions
function parseDistinctCsv(csvData) {
  const lines = csvData.trim().split('\n');
  if (lines.length < 2) return [];
  const header = lines[0].split(',').map((cell) => cell.trim());
  const valueIndex = header.indexOf('_value');
  return lines.slice(1).map(line => line.split(',')[valueIndex].trim());
}

function parseSensorCsv(csvData) {
  const lines = csvData.trim().split('\n');
  if (lines.length < 2) return [];
  const header = lines[0].split(',').map((cell) => cell.trim());
  const timeIndex = header.indexOf('_time');
  const valueIndex = header.indexOf('_value');

  return lines.slice(1).map(line => {
    const cells = line.split(',').map(cell => cell.trim());
    return {
      time: new Date(cells[timeIndex]).getTime(),
      value: parseFloat(cells[valueIndex])
    };
  }).filter(item => !isNaN(item.value));
}

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

  if (!response.ok) throw new Error(`InfluxDB error: ${response.statusText}`);
  return parseDistinctCsv(await response.text());
}

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

  if (!response.ok) throw new Error(`InfluxDB error: ${response.statusText}`);
  return parseSensorCsv(await response.text());
}

const OverlayChart = ({ sensors, timeRangeSec }) => {
  const [data, setData] = useState([]);

  useEffect(() => {
    async function fetchOverlayData() {
      try {
        const sensorDataArray = await Promise.all(
            sensors.map((sensor) => fetchSensorData(sensor.sensorName, timeRangeSec))
        );

        const mergedData = sensorDataArray[0]?.map((point, index) => {
          let mergedPoint = { time: point.time };
          sensors.forEach((sensor, idx) => {
            mergedPoint[sensor.sensorName] = sensorDataArray[idx][index]?.value || null;
          });
          return mergedPoint;
        }) || [];

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
            <XAxis dataKey="time" tickFormatter={(unixTime) => new Date(unixTime).toLocaleTimeString()} />
            <YAxis label={{ value: 'Value', angle: -90, position: 'insideLeft' }} />
            <Tooltip labelFormatter={(unixTime) => new Date(unixTime).toLocaleString()} />
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

export default function Page() {
  const [sensorCharts, setSensorCharts] = useState([]);
  const [availableSensors, setAvailableSensors] = useState([]);
  const [overlaySensors, setOverlaySensors] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [fetchError, setFetchError] = useState(null);
  const [timeRangeSec, setTimeRangeSec] = useState(60);
  const [presetString, setPresetString] = useState('');

  const sensorChartsRef = useRef(sensorCharts);
  const timeRangeSecRef = useRef(timeRangeSec);
  const colorPalette = [
    '#2563eb', '#10b981', '#f97316', '#ef4444', '#eab308',
    '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e', '#7c3aed'
  ];
  const [colorIndex, setColorIndex] = useState(0);

  useEffect(() => {
    async function loadSensors() {
      try {
        const sensorNames = await fetchUniqueSensorsFromInflux();
        setAvailableSensors(sensorNames.map(name => ({ sensorName: name })));
      } catch (error) {
        console.error('Sensor load error:', error);
        setFetchError(error.message);
      }
    }
    loadSensors();
  }, []);

  useEffect(() => {
    sensorChartsRef.current = sensorCharts;
  }, [sensorCharts]);

  useEffect(() => {
    const intervalId = setInterval(async () => {
      const currentCharts = sensorChartsRef.current;
      try {
        const updatedCharts = await Promise.all(
            currentCharts.map(async chart => ({
              ...chart,
              data: await fetchSensorData(chart.sensorName, timeRangeSecRef.current)
            }))
        );
        setSensorCharts(updatedCharts);
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 1000);
    return () => clearInterval(intervalId);
  }, []);

  const toggleOverlaySensor = (sensor) => {
    setOverlaySensors(prev => {
      const existing = prev.find(s => s.sensorName === sensor.sensorName);
      if (existing) return prev.filter(s => s !== existing);

      const newSensor = {
        ...sensor,
        color: colorPalette[colorIndex % colorPalette.length]
      };
      setColorIndex(prev => prev + 1);
      return [...prev, newSensor];
    });
  };

  const addChart = async (sensor) => {
    try {
      const dataPoints = await fetchSensorData(sensor.sensorName, timeRangeSec);
      setSensorCharts(prev => [
        ...prev,
        {
          sensorName: sensor.sensorName,
          color: '#2563eb',
          id: Date.now() + Math.random(),
          data: dataPoints
        }
      ]);
    } catch (error) {
      console.error('Chart add error:', error);
    }
  };

  const removeChart = (chartId) => {
    setSensorCharts(prev => prev.filter(chart => chart.id !== chartId));
  };

  const exportPreset = () => {
    const preset = {
      timeRangeSec,
      individualSensors: sensorCharts.map(chart => chart.sensorName),
      overlaySensors
    };
    return btoa(JSON.stringify(preset));
  };

  const importPreset = (presetStr) => {
    try {
      const preset = JSON.parse(atob(presetStr));
      setTimeRangeSec(preset.timeRangeSec);
      setSensorCharts(preset.individualSensors.map(sensorName => ({
        sensorName,
        color: '#2563eb',
        id: Date.now() + Math.random(),
        data: []
      })));
      setOverlaySensors(preset.overlaySensors);
    } catch (error) {
      console.error('Preset import error:', error);
    }
  };

  const filteredSensors = availableSensors
      .filter(sensor => sensor.sensorName.toLowerCase().includes(searchTerm.toLowerCase()))
      .slice(0, 200);

  return (
      <div style={{ padding: '1rem' }}>
        {/* Preset Manager */}
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
            <button onClick={() => setPresetString(exportPreset())}>
              Save Preset
            </button>
            <button
                onClick={() => importPreset(presetString)}
                style={{ marginLeft: '0.5rem' }}
            >
              Load Preset
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div style={{ display: 'flex' }}>
          {/* Sensors Sidebar */}
          <div style={{
            width: '300px',
            marginRight: '1rem',
            borderRight: '1px solid #ccc',
            paddingRight: '1rem',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <div style={{
              position: 'sticky',
              top: 0,
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(8px)',
              padding: '0.5rem 0',
              zIndex: 1
            }}>
              <h2>Available Sensors</h2>
              {fetchError && (
                  <div style={{ color: 'red', marginBottom: '0.5rem' }}>
                    Error: {fetchError}
                  </div>
              )}
              <input
                  type="text"
                  placeholder="Search sensors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ width: '100%', marginBottom: '0.5rem' }}
              />
            </div>

            <ul style={{ listStyle: 'none', padding: 0 }}>
              {filteredSensors.map((sensor, index) => (
                  <li key={index} style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center' }}>
                    <span style={{ flex: 1 }}>{sensor.sensorName}</span>
                    <button
                        onClick={() => addChart(sensor)}
                        style={{
                          marginLeft: '0.5rem',
                          padding: '0.25rem 0.5rem',
                          backgroundColor: '#2563eb',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                    >
                      Add
                    </button>
                    <button
                        onClick={() => toggleOverlaySensor(sensor)}
                        style={{
                          marginLeft: '0.25rem',
                          padding: '0.25rem 0.5rem',
                          backgroundColor: overlaySensors.some(s => s.sensorName === sensor.sensorName)
                              ? '#10b981'
                              : '#6b7280',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                    >
                      {overlaySensors.some(s => s.sensorName === sensor.sensorName) ? '★' : '☆'}
                    </button>
                  </li>
              ))}
            </ul>
          </div>

          {/* Charts Area */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label>Time Range (seconds):</label>
              <input
                  type="number"
                  value={timeRangeSec}
                  onChange={(e) => setTimeRangeSec(Math.max(1, Number(e.target.value)))}
                  style={{ width: '80px' }}
              />
            </div>

            {overlaySensors.length > 0 && (
                <OverlayChart sensors={overlaySensors} timeRangeSec={timeRangeSec} />
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
              {sensorCharts.map(chart => (
                  <Card key={chart.id} style={{ width: '420px' }}>
                    <CardHeader style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <CardTitle>{chart.sensorName}</CardTitle>
                      <button
                          onClick={() => removeChart(chart.id)}
                          style={{
                            padding: '0.25rem 0.5rem',
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                      >
                        Remove
                      </button>
                    </CardHeader>
                    <CardContent>
                      <LineChart width={400} height={200} data={chart.data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                            dataKey="time"
                            tickFormatter={(unixTime) => new Date(unixTime).toLocaleTimeString()}
                        />
                        <YAxis />
                        <Tooltip
                            labelFormatter={(unixTime) => new Date(unixTime).toLocaleString()}
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
}