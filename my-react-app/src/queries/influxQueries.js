// InfluxDB configuration
export const influxConfig = {
    url: 'http://localhost:8086',
    token: 'K85UHcCTLarwhBvWzdEBzalAmg29MxWizxYSvhfEZtVADsEWVp3xDl8SDoCFkLGxHGxhhksEDdqZSOFrhhXlNQ==',
    org: 'WFR',
    bucket: 'ourCar'
};

// Main query executor
export async function executeQuery(query) {
    try {
        const response = await fetch(`${influxConfig.url}/api/v2/query?org=${influxConfig.org}`, {
            method: 'POST',
            headers: {
                'Authorization': `Token ${influxConfig.token}`,
                'Content-Type': 'application/vnd.flux',
                'Accept': 'application/csv'
            },
            body: query
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const csvData = await response.text();
        return parseInfluxResponse(csvData);
    } catch (error) {
        console.error('Error executing query:', error);
        throw error;
    }
}

// CSV response parser
function parseInfluxResponse(csvData) {
    if (!csvData || csvData.trim() === '') return [];

    const lines = csvData.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',');
    const timeIndex = headers.findIndex(h => h === '_time');
    const valueIndex = headers.findIndex(h => h === '_value');

    return lines.slice(1)
        .filter(line => line.trim() !== '')
        .map(line => {
            const values = line.split(',');
            return {
                _time: values[timeIndex],
                _value: parseFloat(values[valueIndex])
            };
        })
        .filter(point => !isNaN(point._value));
}

export async function fetchInverterCurrent() {
    const query = `
    from(bucket: "${influxConfig.bucket}")
      |> range(start: -1m)
      |> filter(fn: (r) => r["_measurement"] == "canBus")
      |> filter(fn: (r) => r["_field"] == "sensorReading")
      |> filter(fn: (r) => r["messageName"] == "M166_Current_Info")
      |> filter(fn: (r) => r["rawCAN"] == "166")
      |> filter(fn: (r) => r["signalName"] == "INV_Phase_A_Current")
      |> aggregateWindow(every: 1s, fn: mean, createEmpty: false)
      |> yield(name: "mean")
  `;

    try {
        const result = await executeQuery(query);
        return result.map(point => ({
            time: new Date(point._time).getTime(),
            current: point._value
        }));
    } catch (error) {
        console.error('Error in fetchInverterCurrent:', error);
        return [];
    }
}