import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

export const SpeedChart = ({ data }) => (
    <Card>
        <CardHeader>
            <CardTitle>Speed (km/h)</CardTitle>
        </CardHeader>
        <CardContent>
            <LineChart width={400} height={200} data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                    dataKey="time"
                    tickFormatter={(unixTime) => new Date(unixTime).toLocaleTimeString()}
                />
                <YAxis domain={[0, 100]} />
                <Tooltip
                    labelFormatter={(unixTime) => new Date(unixTime).toLocaleTimeString()}
                />
                <Line
                    type="monotone"
                    dataKey="speed"
                    stroke="#e11d48"
                    dot={false}
                    isAnimationActive={false}
                />
            </LineChart>
        </CardContent>
    </Card>
);

export const InverterCurrentChart = ({ data }) => (
    <Card>
        <CardHeader>
            <CardTitle>Inverter Phase A Current</CardTitle>
        </CardHeader>
        <CardContent>
            <LineChart width={400} height={200} data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                    dataKey="time"
                    tickFormatter={(unixTime) => new Date(unixTime).toLocaleTimeString()}
                />
                <YAxis
                    label={{ value: 'Current (A)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                    labelFormatter={(unixTime) => new Date(unixTime).toLocaleString()}
                    formatter={(value) => [`${value.toFixed(2)} A`, 'Current']}
                />
                <Line
                    type="monotone"
                    dataKey="current"
                    stroke="#2563eb"
                    dot={false}
                    isAnimationActive={false}
                />
            </LineChart>
        </CardContent>
    </Card>
);

export const BatteryTemperatureChart = ({ data }) => (
    <Card>
        <CardHeader>
            <CardTitle>Battery Temperature (°C)</CardTitle>
        </CardHeader>
        <CardContent>
            <LineChart width={400} height={200} data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                    dataKey="time"
                    label={{ value: "Time (s)", position: "bottom" }}
                />
                <YAxis domain={[40, 60]} />
                <Tooltip />
                <Line
                    type="monotone"
                    dataKey="batteryTemp"
                    stroke="#2563eb"
                    dot={false}
                />
            </LineChart>
        </CardContent>
    </Card>
);