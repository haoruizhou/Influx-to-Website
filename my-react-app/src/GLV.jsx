"use client";  // This tells Next.js that this is a client component

import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { fetchUniqueSensorsFromInflux, fetchSensorData, parseSensorCsv, parseDistinctCsv } from "../../backend/api/influx/uniqueSensors.js";

export default function Page() {
  // OverlayChart component for sensor overlay
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
              <XAxis dataKey="time" tickFormatter={(unixTime) => new Date(unixTime).toLocaleTimeString()} />
              <YAxis label={{ value: 'Value', angle: -90, position: 'insideLeft' }} />
              <Tooltip labelFormatter={(unixTime) => new Date(unixTime).toLocaleString()} formatter={(value) => [value, '']} />
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

  // Main page component logic
  const [sensorCharts, setSensorCharts] = useState([]);
  const [availableSensors, setAvailableSensors] = useState([]);
  const [overlaySensors, setOverlaySensors] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [fetchError, setFetchError] = useState(null);
  const [timeRangeSec, setTimeRangeSec] = useState(60);
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

  // Fetch available sensors on mount
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

  // Add a new individual chart
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

  // Preset export: encode current settings as a base64 string.
  const exportPreset = () => {
    const preset = {
      timeRangeSec,
      individualSensors: sensorCharts.map((chart) => chart.sensorName),
      overlaySensors,
    };
    return btoa(JSON.stringify(preset));
  };

  // Preset import: decode and apply configuration.
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
      .filter((sensor) => sensor.sensorName.toLowerCase().includes(searchTerm.toLowerCase()))
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
                paddingLeft: '300px',
                marginRight: '1rem',
                borderRight: '1px solid #ccc',
                paddingRight: '1rem',
                maxHeight: '80vh',
                overflowY: 'auto',
              }}
          >
            <div
                style={{
                  position: 'sticky',
                  top: '0px',
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  padding: '0.5rem',
                  zIndex: 10,
                }}
                className={"headerBlur"}
            >
              <h2 style={{ color: '#fff', margin: 0 }}>Available Sensors</h2>
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
                  style={{ width: '100%', marginTop: '0.5rem', marginBottom: '0.5rem' }}
              />
            </div>

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
                    <span style={{ marginRight: 'auto' }}>{sensor.sensorName}</span>
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
                        <XAxis dataKey="time" tickFormatter={(unixTime) => new Date(unixTime).toLocaleTimeString()} />
                        <YAxis label={{ value: 'Value', angle: -90, position: 'insideLeft' }} />
                        <Tooltip labelFormatter={(unixTime) => new Date(unixTime).toLocaleString()} formatter={(value) => [value, '']} />
                        <Line type="monotone" dataKey="value" stroke={chart.color} dot={false} isAnimationActive={false} />
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