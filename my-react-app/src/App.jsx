import React from "react";
import { Routes, Route, Link } from "react-router-dom";
import FSAESimulator from "./fsae-simulator";
import GLV from "./GLV";
import FSAEDownloader from "./FSAEDownloader";  // Import the component
import "./App.css";
import './background.css';

function App() {
  return (
      <div>
        <nav className="navbar">
          <div className="container">
            <ul className="nav-links">
              <li><Link to="/">Home</Link></li>
              <li><Link to="/fsae-simulator">FSAE Simulator</Link></li>
              <li><Link to="/fsae-simulator">Aero</Link></li>
              <li><Link to="/fsae-simulator">Brakes/Pedals</Link></li>
              <li><Link to="/fsae-simulator">Composites</Link></li>
              <li><Link to="/fsae-simulator">Ergo</Link></li>
              <li><Link to="/GLV">GLV</Link></li>
              <li><Link to="/fsae-simulator">Suspension</Link></li>
              <li><Link to="/fsae-simulator">Tractive</Link></li>
              <li><Link to="/fsae-simulator">Wheels/Tires</Link></li>
              <li><Link to="/FSAEDownloader">FSAE Downloader</Link></li>
            </ul>
          </div>
        </nav>

        <div className="content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/fsae-simulator" element={<FSAESimulator />} />
            <Route path="/GLV" element={<GLV />} />
            <Route path="/FSAEDownloader" element={<FSAEDownloader />} /> {/* Added this line */}
          </Routes>
        </div>
      </div>
  );
}

function Home() {
  return (
      <div className="home">
        <h1>Western Formula Racing</h1>
      </div>
  );
}

export default App;