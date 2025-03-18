import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

// ------------------------------
// Helper: Convert datetime-local value to RFC3339 (ISO) string.
function toISO(datetimeLocal) {
    return new Date(datetimeLocal).toISOString();
}

// Helper: Format current date for datetime-local input (YYYY-MM-DDTHH:MM)
function toDatetimeLocal(date) {
    const local = new Date(date);
    local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
    return local.toISOString().slice(0, 16);
}

// Fetch a distinct list of sensor names from InfluxDB.
async function fetchUniqueSensorsFromInflux() {
    const fluxQuery = `
from(bucket: "${import.meta.env.VITE_INFLUX_BUCKET}")
  |> range(start: -1d)
  |> filter(fn: (r) => r["_measurement"] == "canBus")
  |> distinct(column: "signalName")
    `;
    const response = await fetch(`${import.meta.env.VITE_INFLUX_URL}/api/v2/query?org=${import.meta.env.VITE_INFLUX_ORG}`, {
        method: 'POST',
        headers: {
            Authorization: `Token ${import.meta.env.VITE_INFLUX_TOKEN}`,
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

// Fetch time series data for a given sensor using an absolute time range.
// Note: No aggregation is performed.
async function fetchSensorDataForRange(sensorName, startTime, endTime) {
    const startISO = toISO(startTime);
    const endISO = toISO(endTime);
    // Time values are now passed without quotes.
    const fluxQuery = `
from(bucket: "${import.meta.env.VITE_INFLUX_BUCKET}")
  |> range(start: ${startISO}, stop: ${endISO})
  |> filter(fn: (r) => r["_measurement"] == "canBus")
  |> filter(fn: (r) => r["signalName"] == "${sensorName}")
  |> filter(fn: (r) => r["_field"] == "sensorReading")
  |> yield(name: "raw")
    `;
    const response = await fetch(`${import.meta.env.VITE_INFLUX_URL}/api/v2/query?org=${import.meta.env.VITE_INFLUX_ORG}`, {
        method: 'POST',
        headers: {
            Authorization: `Token ${import.meta.env.VITE_INFLUX_TOKEN}`,
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

// Parse CSV for distinct sensor query results.
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

// Parse CSV from a time series query, extracting _time and _value.
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

// Helper: Convert an array of objects to CSV text.
function convertToCSV(data) {
    if (data.length === 0) return '';
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    data.forEach((row) => {
        const values = headers.map(header => row[header]);
        csvRows.push(values.join(','));
    });
    return csvRows.join('\n');
}

// Generate the raw Flux query based on user inputs.
function generateFluxQuery(selectedSensor, startTime, endTime) {
    if (!selectedSensor || !startTime || !endTime) return '';
    const startISO = toISO(startTime);
    const endISO = toISO(endTime);
    return `
from(bucket: "${import.meta.env.VITE_INFLUX_BUCKET}")
  |> range(start: ${startISO}, stop: ${endISO})
  |> filter(fn: (r) => r["_measurement"] == "canBus")
  |> filter(fn: (r) => r["signalName"] == "${selectedSensor}")
  |> filter(fn: (r) => r["_field"] == "sensorReading")
  |> yield(name: "raw")
    `.trim();
}

const WFRDownloader = () => {
    const [availableSensors, setAvailableSensors] = useState([]);
    const [selectedSensor, setSelectedSensor] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [previewData, setPreviewData] = useState([]);
    const [fetchError, setFetchError] = useState(null);
    const [currentLocalTime, setCurrentLocalTime] = useState(new Date());
    const [customMinutes, setCustomMinutes] = useState(0);

    // Update current time every second.
    useEffect(() => {
        const intervalId = setInterval(() => {
            setCurrentLocalTime(new Date());
        }, 1000);
        return () => clearInterval(intervalId);
    }, []);

    // On mount, fetch distinct sensor names.
    useEffect(() => {
        async function getSensors() {
            try {
                const sensorNames = await fetchUniqueSensorsFromInflux();
                const sensorObjects = sensorNames.map((name) => ({
                    sensorName: name,
                    color: '#2563eb'
                }));
                setAvailableSensors(sensorObjects);
            } catch (error) {
                console.error('Error fetching sensors:', error);
                setFetchError(error.message);
            }
        }
        getSensors();
    }, []);

    // Quick entry: set End Time to now.
    const handleSetNow = () => {
        setEndTime(toDatetimeLocal(new Date()));
    };

    // Quick entry: set Start Time to now minus 5 minutes.
    const handleSetNowMinus5 = () => {
        const dt = new Date(Date.now() - 5 * 60 * 1000);
        setStartTime(toDatetimeLocal(dt));
    };

    // Quick entry: set Start Time to now minus custom minutes.
    const handleSetNowMinusCustom = () => {
        const dt = new Date(Date.now() - customMinutes * 60 * 1000);
        setStartTime(toDatetimeLocal(dt));
    };

    // Handle preview button click.
    const handlePreview = async () => {
        if (!selectedSensor || !startTime || !endTime) {
            alert('Please select a sensor and set both start and end times.');
            return;
        }
        try {
            const dataPoints = await fetchSensorDataForRange(selectedSensor, startTime, endTime);
            setPreviewData(dataPoints);
        } catch (err) {
            console.error('Error fetching sensor data:', err);
            setFetchError(err.message);
        }
    };

    // Handle CSV download.
    const handleDownload = () => {
        const csvText = convertToCSV(previewData);
        if (!csvText) {
            alert('No data available to download.');
            return;
        }
        const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${selectedSensor}_${Date.now()}.csv`);
        link.click();
    };

    // Generate query preview whenever inputs change.
    const queryPreview = generateFluxQuery(selectedSensor, startTime, endTime);

    return (
        <div style={{ padding: '1rem', fontFamily: 'Arial, sans-serif' }}>
            <h1>WFR Downloader</h1>

            {fetchError && (
                <div style={{ color: 'red', marginBottom: '1rem' }}>
                    Error: {fetchError}
                </div>
            )}

            {/* Display Current Local Time and UTC Time */}
            <div style={{ marginBottom: '1rem', border: '1px solid #ccc', padding: '0.5rem' }}>
                <strong>Current Local Time:</strong> {currentLocalTime.toLocaleString()}<br />
                <strong>Current UTC Time:</strong> {currentLocalTime.toISOString()}
            </div>

            {/* Sensor Selection */}
            <div style={{ marginBottom: '1rem' }}>
                <label style={{ marginRight: '0.5rem' }}>Select Sensor:</label>
                <select
                    value={selectedSensor}
                    onChange={(e) => setSelectedSensor(e.target.value)}
                >
                    <option value="">-- Choose a sensor --</option>
                    {availableSensors.map((sensor, index) => (
                        <option key={index} value={sensor.sensorName}>
                            {sensor.sensorName}
                        </option>
                    ))}
                </select>
            </div>

            {/* Time Range Inputs */}
            <div style={{ marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
                <div>
                    <label style={{ marginRight: '0.5rem' }}>Start Time:</label>
                    <input
                        type="datetime-local"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                    />
                </div>
                <button
                    onClick={handleSetNowMinus5}
                    style={{
                        padding: '0.25rem 0.5rem',
                        backgroundColor: '#2563eb',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    Now minus 5 min
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <input
                        type="number"
                        placeholder="min"
                        value={customMinutes}
                        onChange={(e) => setCustomMinutes(Number(e.target.value))}
                        style={{ width: '60px' }}
                    />
                    <button
                        onClick={handleSetNowMinusCustom}
                        style={{
                            padding: '0.25rem 0.5rem',
                            backgroundColor: '#2563eb',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        Now minus custom
                    </button>
                </div>
            </div>
            <div style={{ marginBottom: '1rem' }}>
                <label style={{ marginRight: '0.5rem' }}>End Time:</label>
                <input
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                />
                <button
                    onClick={handleSetNow}
                    style={{
                        marginLeft: '0.5rem',
                        padding: '0.25rem 0.5rem',
                        backgroundColor: '#2563eb',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    Now
                </button>
            </div>

            {/* Query Preview Window */}
            <div style={{
                border: '1px solid #ccc',
                backgroundColor: 'darkblue',
                padding: '1rem',
                marginBottom: '1rem',
                maxHeight: '200px',
                overflowY: 'auto'
            }}>
                <h2>Query Preview</h2>
                <pre style={{ whiteSpace: 'pre-wrap' }}>
                    {queryPreview || 'No query to display.'}
                </pre>
            </div>

            {/* Preview and Download Buttons */}
            <div style={{ marginBottom: '1rem' }}>
                <button
                    onClick={handlePreview}
                    style={{
                        marginRight: '1rem',
                        padding: '0.5rem 1rem',
                        backgroundColor: '#2563eb',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    Preview Data
                </button>
                <button
                    onClick={handleDownload}
                    style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#16a34a',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    Download CSV
                </button>
            </div>

            {/* Data Preview Window */}
            <div style={{
                border: '1px solid #ccc',
                padding: '1rem',
                backgroundColor: 'darkblue'
            }}>
                <h2>Data Preview</h2>
                {previewData.length === 0 ? (
                    <p>No data to preview.</p>
                ) : (
                    <>
                        {/* Chart Preview */}
                        <LineChart width={500} height={300} data={previewData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="time"
                                tickFormatter={(unixTime) => new Date(unixTime).toLocaleTimeString()}
                            />
                            <YAxis
                                label={{ value: 'Value', angle: -90, position: 'insideLeft' }}
                            />
                            <Tooltip
                                labelFormatter={(unixTime) => new Date(unixTime).toLocaleString()}
                            />
                            <Line type="monotone" dataKey="value" stroke="#FFA500" dot={false} />
                        </LineChart>
                        {/* Raw Data Preview (limited to ~10 lines with scrollbar) */}
                        <pre style={{
                            whiteSpace: 'pre-wrap',
                            marginTop: '1rem',
                            maxHeight: '150px',
                            overflowY: 'auto',
                            border: '1px solid #ddd',
                            padding: '0.5rem'
                        }}>
                            {previewData.map((dp, index) => {
                                const date = new Date(dp.time).toLocaleString();
                                return `${index + 1}. ${date}, ${dp.value}\n`;
                            })}
                        </pre>
                    </>
                )}
            </div>
        </div>
    );
};

export default WFRDownloader;