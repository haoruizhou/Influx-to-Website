import React, { useState, useEffect } from 'react';
import {
    INFLUX_URL,
    INFLUX_TOKEN,
    INFLUX_ORG,
    INFLUX_BUCKET,
} from '../../backend/db/influxClient.js';

// Fetch a distinct list of sensor names from InfluxDB
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

// Fetch time series data for a given sensor using an absolute time range
async function fetchSensorDataForRange(sensorName, startTime, endTime) {
    const fluxQuery = `
    from(bucket: "${INFLUX_BUCKET}")
      |> range(start: "${startTime}", stop: "${endTime}")
      |> filter(fn: (r) => r["_measurement"] == "canBus")
      |> filter(fn: (r) => r["signalName"] == "${sensorName}")
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

const FSAEDownloader = () => {
    const [availableSensors, setAvailableSensors] = useState([]);
    const [selectedSensor, setSelectedSensor] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [previewData, setPreviewData] = useState([]);
    const [fetchError, setFetchError] = useState(null);

    // On mount, fetch distinct sensor names.
    useEffect(() => {
        async function getSensors() {
            try {
                const sensorNames = await fetchUniqueSensorsFromInflux();
                // For convenience, assign a default color.
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
        // Set filename including sensor name and current timestamp.
        link.setAttribute('download', `${selectedSensor}_${Date.now()}.csv`);
        link.click();
    };

    return (
        <div style={{ padding: '1rem', fontFamily: 'Arial, sans-serif' }}>
            <h1>FSAE Downloader</h1>

            {fetchError && (
                <div style={{ color: 'red', marginBottom: '1rem' }}>
                    Error: {fetchError}
                </div>
            )}

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
            <div style={{ marginBottom: '1rem' }}>
                <label style={{ marginRight: '0.5rem' }}>Start Time:</label>
                <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                />
            </div>
            <div style={{ marginBottom: '1rem' }}>
                <label style={{ marginRight: '0.5rem' }}>End Time:</label>
                <input
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                />
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

            {/* Preview Window */}
            <div style={{
                border: '1px solid #ccc',
                padding: '1rem',
                maxHeight: '400px',
                overflowY: 'auto',
                backgroundColor: '#f9f9f9'
            }}>
                <h2>Data Preview</h2>
                {previewData.length === 0 ? (
                    <p>No data to preview.</p>
                ) : (
                    <pre style={{ whiteSpace: 'pre-wrap' }}>
            {previewData.map((dp, index) => {
                // Format time as local string
                const date = new Date(dp.time).toLocaleString();
                return `${index + 1}. ${date}, ${dp.value}\n`;
            })}
          </pre>
                )}
            </div>
        </div>
    );
};

export default FSAEDownloader;