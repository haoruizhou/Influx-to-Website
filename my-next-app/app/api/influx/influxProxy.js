export default async function handler(req, res) {
    const { query } = req;
    const influxUrl = `http://35.183.158.105:8086/api/v2/query?org=${process.env.INFLUX_ORG}`;

    try {
        const response = await fetch(influxUrl, {
            method: 'POST',
            headers: {
                Authorization: `Token ${process.env.INFLUX_TOKEN}`,
                'Content-Type': 'application/vnd.flux',
            },
            body: req.body
        });

        const data = await response.text();
        res.status(response.status).send(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}