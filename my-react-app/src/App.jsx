import React from "react";
import { Routes, Route, Link } from "react-router-dom";
import FSAESimulator from "./fsae-simulator";
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
          </ul>
        </div>
      </nav>

      <div className="content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/fsae-simulator" element={<FSAESimulator />} />
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
