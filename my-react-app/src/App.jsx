import React from "react";
import { Routes, Route, Link, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { useAuth } from "./contexts/AuthContext";
import Login from "./components/Login";
import FSAESimulator from "./fsae-simulator";
import GLV from "./GLV";
import WFRDownloader from "./WFRDownloader.jsx";
import WFRLogo from './assets/WFR_DAQ_Logo.png';
import OldGLV from "./oldGLV";
import "./App.css";
import './background.css';

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const { isLoggedIn, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <div>
        <nav className="navbar">
          <div className="container">
            <ul className="nav-links">
              <li><Link to="/">Home</Link></li>
              <li><Link to="/fsae-simulator">FSAE Simulator</Link></li>
              <li><Link to="/fsae-simulator">Aero</Link></li>
              <li><Link to="/fsae-simulator">Brakes/Pedals</Link></li>
              {/*<li><Link to="/fsae-simulator">Composites</Link></li>*/}
              {/*<li><Link to="/fsae-simulator">Ergo</Link></li>*/}
              <li><Link to="/GLV">GLV</Link></li>
              <li><Link to="/oldGLV">oldGLV</Link></li>
              <li><Link to="/fsae-simulator">Suspension</Link></li>
              <li><Link to="/fsae-simulator">Wheels/Tires</Link></li>
              <li><Link to="/WFRDownloader">WFR Downloader</Link></li>
              <li><Link to="/login">Login</Link></li>
              <li><LogoutButton /></li>
            </ul>
          </div>
        </nav>

        <div className="content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            
            {/* Protected routes */}
            <Route path="/fsae-simulator" element={
              <ProtectedRoute>
                <FSAESimulator />
              </ProtectedRoute>
            } />
            <Route path="/GLV" element={
              <ProtectedRoute>
                <GLV />
              </ProtectedRoute>
            } />
            <Route path="/WFRDownloader" element={
              <ProtectedRoute>
                <WFRDownloader />
              </ProtectedRoute>
            } />
            <Route path="/oldGLV" element={
              <ProtectedRoute>
                <OldGLV />
              </ProtectedRoute>
            } />
          </Routes>
        </div>
      </div>
    </AuthProvider>
  );
}

// Logout button component
function LogoutButton() {
  const { isLoggedIn, setIsLoggedIn, setUser } = useAuth();
  
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setUser(null);
  };

  if (!isLoggedIn) return null;
  
  return (
    <button 
      onClick={handleLogout}
      style={{ 
        background: 'none', 
        border: 'none', 
        color: 'inherit', 
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: 'inherit'
      }}
    >
      Logout
    </button>
  );
}

function Home() {
  return (
    <div className="home">
      <img
        src={WFRLogo}
        alt="Western Formula Racing Data Acquisition Logo"
        style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'contain' }}
      />
    </div>
  );
}

export default App;