import React, { useState, useRef, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Play, Pause, RotateCcw, Edit, Check } from 'lucide-react';


const FSAESimulator = () => {
  
  const [isPlaying, setIsPlaying] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [data, setData] = useState([]);
  const [carPosition, setCarPosition] = useState({ x: 0, y: 0, angle: 0 });
  //Initial track points
  const [trackPoints, setTrackPoints] = useState([
    { x: 150, y: 300 },
    { x: 250, y: 300 },
    { x: 300, y: 200 },
    { x: 300, y: 150 },
    { x: 300, y: 50 },
    { x: 450, y: 50 },
    { x: 500, y: 150 },
    { x: 550, y: 250 },
    { x: 700, y: 250 },
    { x: 750, y: 150 },
    { x: 800, y: 50 },
    { x: 900, y: 100 },
    { x: 900, y: 200 },
    { x: 900, y: 300 },
    { x: 800, y: 350 },
    { x: 700, y: 300 },
    { x: 600, y: 250 },
    { x: 500, y: 300 },
    { x: 400, y: 350 },
    { x: 300, y: 400 },
    { x: 100, y: 350 },
    { x: 150, y: 300 }
  ]);

  const animationFrame = useRef();
  const startTime = useRef(Date.now());
  const pathLength = useRef(0);
  const pathRef = useRef();

  //Handles user movement of the track points
  const handlePointDrag = (index, event) => {
    const svg = event.target.ownerSVGElement;
    const {left, top } = svg.getBoundingClientRect();
    const newTrackPoints = [...trackPoints];
    newTrackPoints[index] = {
      x: event.clientX - left,
      y: event.clientY - top
    };
    setTrackPoints(newTrackPoints);
  };

  const generatePathD = () => {
    return `M ${trackPoints.map(p => `${p.x},${p.y}`).join(' ')}`;
  };

  const handleReset = () => {
    startTime.current = Date.now();
    setData([]);
    setCarPosition({ x: 100, y: 200, angle: 0 });

  };


  useEffect(() => {
    if (pathRef.current) {
      pathLength.current = pathRef.current.getTotalLength();
    }
  }, [trackPoints]); //this will recaluclate the path length when the track points change

  useEffect(() => {
    if (!isPlaying) {
      cancelAnimationFrame(animationFrame.current);
      return;
    }

    const updateSimulation = () => {
      const currentTime = Date.now();
      const elapsedTime = (currentTime - startTime.current) / 1000;
      
      // Calculate car position along the path
      const distance = (elapsedTime * 100) % pathLength.current;
      const point = pathRef.current.getPointAtLength(distance);
      
      // Calculate angle of movement for car rotation
      const nextPoint = pathRef.current.getPointAtLength(distance + 1);
      const angle = Math.atan2(nextPoint.y - point.y, nextPoint.x - point.x) * (180 / Math.PI);
      
      // Update car position
      setCarPosition({
        x: point.x,
        y: point.y,
        angle: angle
      });

      // Simulate speed and temperature based on position in track
      const speedBase = 60;
      const speedVariation = Math.sin(distance / pathLength.current * Math.PI * 2) * 20;
      const speed = speedBase + speedVariation; // 40-80 km/h

      const tempBase = 50;
      const tempVariation = Math.sin(distance / pathLength.current * Math.PI * 4) * 5;
      const batteryTemp = tempBase + tempVariation + (speed - speedBase) * 0.1; // Temperature affected by speed
      
      setData(prevData => {
        const newData = [...prevData, {
          time: elapsedTime.toFixed(1),
          speed,
          batteryTemp,
          distance: (distance / pathLength.current * 100).toFixed(1)
        }];
        return newData.slice(-50);
      });
      
      animationFrame.current = requestAnimationFrame(updateSimulation);
    };

    updateSimulation();
    return () => cancelAnimationFrame(animationFrame.current);
  }, [isPlaying]);


  return (
  <div className="simulator-content" style={{ marginTop: '300px' }}>
  <div className="simulator-container flex">
    {/* Side Column */}
    <div className="w-1/4 p-4 border-r border-gray-200">
      <h2 className="text-lg font-bold">Track Editor</h2>
      <p className="text-sm text-gray-600 mb-4">
      {isEditMode
          ? 'Click and drag points to edit the track'
          : 'Click the edit button to start editing the track'}
      </p>
      <button
        onClick={() => setIsEditMode(!isEditMode)}
        className = "w-full p-2 bg-blue-500 text-white rounded-mb mb-4">
          {isEditMode ? "Save Track" : "Edit Track"}
        </button>
        <button
          onClick={handleReset}
          className="w-full p-2 bg-gray-500 text-white rounded-md">
            Reset Simulation</button>
    </div>


    {/* Main Content */}
    <div className="w-3/4 max-w-6xl mx-auto p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>FSAE Race Track Simulation</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-2 rounded-full hover:bg-gray-100"
                >
                  {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                </button>
                <button
                  onClick={handleReset}
                  className="p-2 rounded-full hover:bg-gray-100"
                >
                  <RotateCcw size={24} />
                </button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <svg
              width="1000"
              height="400"
              className="border border-gray-200 rounded-lg bg-gray-50"
            >
              {/* Race Track */}
              <path
                ref={pathRef}
                d={generatePathD()}
                fill="none"
                stroke="#333"
                strokeWidth="40"
                strokeLinecap="round"
              />
              <path
                d={generatePathD()}
                fill="none"
                stroke="#666"
                strokeWidth="38"
                strokeLinecap="round"
                strokeDasharray="5,5"
              />

              {/* Editable Points */}
              {isEditMode &&
                trackPoints.map((point, index) => (
                  <circle
                    key={index}
                    cx={point.x}
                    cy={point.y}
                    r="10"
                    fill="blue"
                    className="cursor-pointer"
                    onMouseDown={(e) => {
                      const moveHandler = (event) =>
                        handlePointDrag(index, event);
                      const upHandler = () => {
                        document.removeEventListener(
                          "mousemove",
                          moveHandler
                        );
                        document.removeEventListener("mouseup", upHandler);
                      };
                      document.addEventListener("mousemove", moveHandler);
                      document.addEventListener("mouseup", upHandler);
                    }}
                  />
                ))}

              {/* FSAE Race Car */}
              <g
                transform={`translate(${carPosition.x},${carPosition.y}) rotate(${carPosition.angle})`}
              >
                <rect
                  x="-15"
                  y="-10"
                  width="30"
                  height="20"
                  rx="5"
                  fill="#e11d48"
                />
                <circle cx="-10" cy="10" r="4" fill="#333" />
                <circle cx="10" cy="10" r="4" fill="#333" />
                <path
                  d="M15,-5 L22,0 L15,5"
                  fill="none"
                  stroke="#333"
                  strokeWidth="2"
                />
              </g>
            </svg>
          </CardContent>
        </Card>

        {/* Speed and Battery Temperature Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Speed (km/h)</CardTitle>
            </CardHeader>
            <CardContent>
              <LineChart width={400} height={200} data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="time"
                  label={{ value: "Time (s)", position: "bottom" }}
                />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="speed"
                  stroke="#e11d48"
                  dot={false}
                />
              </LineChart>
            </CardContent>
          </Card>

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
        </div>
      </div>
    </div>
  </div>
  );
};

export default FSAESimulator;