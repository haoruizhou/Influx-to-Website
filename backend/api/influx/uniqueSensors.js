async function fetchUniqueSensorsFromInflux() {
    const fluxQuery = `
    from(bucket: "${import.meta.env.VITE_INFLUX_BUCKET}")
      |> range(start: -1d)
      |> filter(fn: (r) => r["_measurement"] == "canBus")
      |> distinct(column: "signalName")
  `;
    // **MODIFIED: Using proxy endpoint instead of direct InfluxDB URL and removing Authorization header**
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
        console.log("Proxy call to InfluxDB failed. Query:", fluxQuery);
        throw new Error(`InfluxDB query error: ${response.status} ${response.statusText}`);
    }

    const csvData = await response.text();
    return parseDistinctCsv(csvData);
}

// 2) Fetch time series data for a sensor over the last "timeRangeSec" seconds
async function fetchSensorData(signalName, timeRangeSec) {
    const fluxQuery = `
    from(bucket: "${import.meta.env.VITE_INFLUX_BUCKET}")
      |> range(start: -${timeRangeSec}s)
      |> filter(fn: (r) => r["_measurement"] == "canBus")
      |> filter(fn: (r) => r["signalName"] == "${signalName}")
      |> filter(fn: (r) => r["_field"] == "sensorReading")
      |> aggregateWindow(every: 1s, fn: mean, createEmpty: false)
      |> yield(name: "mean")
  `;

    // **MODIFIED: Using proxy endpoint instead of direct InfluxDB URL and removing Authorization header**
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

export { fetchUniqueSensorsFromInflux, fetchSensorData, parseSensorCsv, parseDistinctCsv };