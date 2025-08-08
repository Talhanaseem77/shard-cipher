import { Button } from "@/components/ui/button";
import { Shield, LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import logo from "/lovable-uploads/11d45449-ee74-4152-976e-03dd7cdd6e51.png";

export const Navigation = () => {
  const { user, signOut } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="ZettlerShare Logo" className="w-10 h-10" />
          <span className="text-xl font-bold gradient-text">ZettlerShare</span>
        </Link>
        
        {!user && (
          <div className="hidden md:flex items-center gap-6">
            <Link to="#features" className="text-muted-foreground hover:text-foreground transition-colors">
              Features
            </Link>
            <Link to="#security" className="text-muted-foreground hover:text-foreground transition-colors">
              Security
            </Link>
            <Link to="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </Link>
          </div>
        )}

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="text-sm text-muted-foreground hidden md:block">
                {user.email}
              </span>
              <Button variant="outline" size="sm" onClick={signOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link to="/login">Login</Link>
              </Button>
              <Button variant="default" asChild className="security-glow">
                <Link to="/signup">Get Started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};