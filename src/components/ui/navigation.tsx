import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";

export const Navigation = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="SecureShare Logo" className="w-8 h-8" />
          <span className="text-xl font-bold gradient-text">SecureShare</span>
        </Link>
        
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

        <div className="flex items-center gap-3">
          <Button variant="ghost" asChild>
            <Link to="/login">Login</Link>
          </Button>
          <Button variant="default" asChild className="security-glow">
            <Link to="/signup">Get Started</Link>
          </Button>
        </div>
      </div>
    </nav>
  );
};