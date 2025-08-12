import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { generateSalt, arrayBufferToBase64 } from "@/lib/encryption";
import logo from "/lovable-uploads/11d45449-ee74-4152-976e-03dd7cdd6e51.png";

export default function Signup() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: ""
  });

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkAuth();
  }, [navigate]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(""); // Clear error when user types
  };

  const validatePassword = (password: string) => {
    const minLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSymbols = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    return {
      minLength,
      hasCase: hasUppercase && hasLowercase,
      hasNumbersOrSymbols: hasNumbers || hasSymbols,
      isValid: minLength && hasUppercase && hasLowercase && (hasNumbers || hasSymbols)
    };
  };

  const cleanupAuthState = () => {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });
    Object.keys(sessionStorage || {}).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        sessionStorage.removeItem(key);
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    // Validate password strength
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      setError("Password does not meet security requirements.");
      setLoading(false);
      return;
    }

    try {
      // Clean up existing auth state
      cleanupAuthState();
      
      // Attempt global sign out first
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Continue even if this fails
      }

      const redirectUrl = `${window.location.origin}/dashboard`;
      
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) {
        if (error.message.includes("already registered")) {
          setError("An account with this email already exists. Try signing in instead.");
        } else if (error.message.includes("Password should be")) {
          setError("Password is too weak. Please choose a stronger password.");
        } else {
          setError(error.message);
        }
        return;
      }

      if (data.user) {
        // Generate and store user's salt for key derivation
        try {
          const salt = generateSalt();
          const saltBase64 = arrayBufferToBase64(salt);
          
          // Store salt in profile (this will be created by trigger)
          setTimeout(async () => {
            await supabase
              .from('profiles')
              .update({ avatar_url: `salt:${saltBase64}` })
              .eq('user_id', data.user!.id);
          }, 1000); // Delay to let profile creation trigger complete
        } catch (saltError) {
          console.error('Error storing salt:', saltError);
          // Don't fail signup for this
        }
        
        setSuccess(true);
        toast({
          title: "Account created successfully!",
          description: "Please check your email to confirm your account before signing in.",
        });
        
        // Redirect to login after a short delay
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      }
    } catch (error: any) {
      setError("An unexpected error occurred. Please try again.");
      console.error("Signup error:", error);
    } finally {
      setLoading(false);
    }
  };

  const passwordValidation = validatePassword(formData.password);
  const passwordsMatch = formData.password && formData.confirmPassword && 
                        formData.password === formData.confirmPassword;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-dark p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <img src={logo} alt="ZettlerShare" className="w-10 h-10" />
            <span className="text-2xl font-bold gradient-text">ZettlerShare</span>
          </Link>
        </div>

        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold">Create your account</CardTitle>
            <CardDescription>
              Join thousands of users sharing files securely
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
            {success && (
              <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-green-500">Account created! Check your email to confirm before signing in.</p>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  required
                  className="bg-input/50"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    required
                    className="bg-input/50 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                    required
                    className="bg-input/50 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                {passwordsMatch && (
                  <div className="flex items-center gap-2 text-sm text-green-500">
                    <CheckCircle className="w-4 h-4" />
                    Passwords match
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="text-xs text-muted-foreground">
                  Password requirements:
                  <ul className="mt-1 space-y-1 ml-4">
                    <li className="flex items-center gap-2">
                      {passwordValidation.minLength ? (
                        <CheckCircle className="w-3 h-3 text-green-500" />
                      ) : (
                        <div className="w-3 h-3 border border-muted-foreground rounded-full" />
                      )}
                      <span className={passwordValidation.minLength ? "text-green-500" : ""}>
                        At least 8 characters
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      {passwordValidation.hasCase ? (
                        <CheckCircle className="w-3 h-3 text-green-500" />
                      ) : (
                        <div className="w-3 h-3 border border-muted-foreground rounded-full" />
                      )}
                      <span className={passwordValidation.hasCase ? "text-green-500" : ""}>
                        Contains uppercase and lowercase
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      {passwordValidation.hasNumbersOrSymbols ? (
                        <CheckCircle className="w-3 h-3 text-green-500" />
                      ) : (
                        <div className="w-3 h-3 border border-muted-foreground rounded-full" />
                      )}
                      <span className={passwordValidation.hasNumbersOrSymbols ? "text-green-500" : ""}>
                        Contains numbers or symbols
                      </span>
                    </li>
                  </ul>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full security-glow" 
                disabled={loading || !passwordValidation.isValid || !passwordsMatch}
              >
                <Shield className="w-4 h-4 mr-2" />
                {loading ? "Creating Account..." : "Create Secure Account"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link 
                  to="/login" 
                  className="text-primary hover:text-primary-glow transition-colors font-medium"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Your password will generate a unique encryption key. We never store your password or key.
            All encryption happens in your browser for maximum security.
          </p>
        </div>
      </div>
    </div>
  );
}