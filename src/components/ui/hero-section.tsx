import { Button } from "@/components/ui/button";
import { Shield, Lock, Key, Upload } from "lucide-react";
import { Link } from "react-router-dom";
import heroBg from "@/assets/hero-bg.jpg";
export const HeroSection = () => {
  return <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20" style={{
      backgroundImage: `url(${heroBg})`
    }} />
      <div className="absolute inset-0 bg-gradient-dark" />
      
      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          {/* Security Badge */}
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 mb-8">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-medium">Zero-Trust File Sharing</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="gradient-text">Zero-Trust File Sharing</span>
            <br />
            With ZettlerShare
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed">
            Upload, encrypt, and share files with military-grade security. 
            Your data is encrypted client-side before it ever leaves your device.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button size="lg" asChild className="security-glow text-lg px-8 py-6">
              <Link to="/signup">
                <Upload className="w-5 h-5 mr-2" />
                Start Sharing Securely
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-6">
              <Lock className="w-5 h-5 mr-2" />
              Learn About Security
            </Button>
          </div>

          {/* Security Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-card/50 backdrop-blur-sm border border-border rounded-lg p-6">
              <Key className="w-8 h-8 text-primary mb-4 mx-auto" />
              <h3 className="font-semibold text-lg mb-2">Client-Side Encryption</h3>
              <p className="text-muted-foreground text-sm">
                Files encrypted with AES-GCM before upload. We never see your data.
              </p>
            </div>
            
            
            
            <div className="bg-card/50 backdrop-blur-sm border border-border rounded-lg p-6">
              <Lock className="w-8 h-8 text-primary mb-4 mx-auto" />
              <h3 className="font-semibold text-lg mb-2">Secure Sharing</h3>
              <p className="text-muted-foreground text-sm">
                Share via encrypted links with automatic expiration.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>;
};