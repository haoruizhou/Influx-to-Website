import { Link } from "react-router-dom";
import { LogIn } from "lucide-react";
import { Button } from "../components/ui/button";
import { useAuth } from "../contexts/AuthContext";

const Header = () => {
  const { isLoggedIn, setIsLoggedIn, setUser } = useAuth();

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    setIsLoggedIn(false);
    setUser(null);
  };

  return (
    <header className="bg-racing-black text-white py-4 px-6 border-b border-racing-magenta">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="flex items-center space-x-3">
          <img 
            src="/lovable-uploads/d69e8d2c-f661-4954-9193-3370210f3467.png" 
            alt="Western Formula Racing" 
            className="h-12" 
          />
        </Link>
        <div className="flex items-center">
          <nav className="flex space-x-6 mr-6">
            <Link to="/" className="hover:text-racing-orange transition-colors">
              Home
            </Link>
            <Link to="/dashboard" className="hover:text-racing-orange transition-colors">
              Dashboard
            </Link>
            <Link to="/about" className="hover:text-racing-orange transition-colors">
              About
            </Link>
          </nav>
          {isLoggedIn ? (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLogout} 
              className="border-racing-magenta text-white hover:bg-racing-magenta/20"
            >
              Logout
            </Button>
          ) : (
            <Link to="/login">
              <Button 
                variant="outline" 
                size="sm" 
                className="border-racing-magenta text-white hover:bg-racing-magenta/20"
              >
                <LogIn className="mr-2 h-4 w-4" />
                Login
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
