import React from "react";
import { Routes, Route, Link, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Login from "./components/Login";
import FSAESimulator from "./fsae-simulator";
import GLV from "./GLV";
import WFRDownloader from "./WFRDownloader.jsx";
import WFRLogo from './assets/WFR_DAQ_Logo.png';
import OldGLV from "./oldGLV";
import "./App.css";
import WFRFullLogo from './assets/WFR_DAQ_Logo.png';

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

function LogoutButton() {
  const { isLoggedIn, setIsLoggedIn, setUser } = useAuth();

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    setIsLoggedIn(false);
    setUser(null);
  };

  if (!isLoggedIn) return null;

  return (
    <button
      onClick={handleLogout}
      className="logout-button"
    >
      Logout
    </button>
  );
}

function Home() {
  return (
    <div className="hero-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      {/* Remove the text elements and just display the image */}
      <img 
        src={WFRFullLogo} 
        alt="Western Formula Racing Data Acquisition" 
        style={{
          maxWidth: '80%',
          maxHeight: '80vh',
          objectFit: 'contain'
        }}
      />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <div className="app-container">
        {/* Dark overlay */}
        <div className="overlay" />
        
        {/* Content container with higher z-index */}
        <div className="content-container">
          {/* Navigation */}
          <nav className="navbar">
            <Link to="/">
              <img src={WFRLogo} alt="WFR Logo" className="navbar-logo" />
            </Link>
            <div className="navbar-links">
              <Link to="/" className="nav-link">Home</Link>
              <Link to="/fsae-simulator" className="nav-link">FSAE Simulator</Link>
              <Link to="/WFRDownloader" className="nav-link">WFR Downloader</Link>
              <Link to="/login" className="nav-link nav-button">
                Login
              </Link>
              <LogoutButton />
            </div>
          </nav>

          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/fsae-simulator"
              element={
                <ProtectedRoute>
                  <FSAESimulator />
                </ProtectedRoute>
              }
            />
            <Route
              path="/GLV"
              element={
                <ProtectedRoute>
                  <GLV />
                </ProtectedRoute>
              }
            />
            <Route
              path="/WFRDownloader"
              element={
                <ProtectedRoute>
                  <WFRDownloader />
                </ProtectedRoute>
              }
            />
            <Route
              path="/oldGLV"
              element={
                <ProtectedRoute>
                  <OldGLV />
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </div>
    </AuthProvider>
  );
}

export default App;