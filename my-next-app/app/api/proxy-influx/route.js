// app/api/proxy-influx/route.js
export async function POST(request) {
    try {
        const body = await request.text();
        const influxResponse = await fetch(`http://35.183.158.105:8086/api/v2/query?org=${process.env.NEXT_PUBLIC_INFLUX_ORG}`, {
            method: 'POST',
            headers: {
                Authorization: `Token ${process.env.NEXT_PUBLIC_INFLUX_TOKEN}`,
                'Content-Type': 'application/vnd.flux',
                Accept: 'application/csv'
            },
            body: body,
        });

        if (!influxResponse.ok) {
            return new Response(`InfluxDB query error: ${influxResponse.statusText}`, { status: influxResponse.status });
        }
        const csvData = await influxResponse.text();
        return new Response(csvData, { status: 200 });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.toString() }), { status: 500 });
    }
}