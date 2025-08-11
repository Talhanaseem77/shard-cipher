import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Mail, AlertCircle, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import logo from "/lovable-uploads/11d45449-ee74-4152-976e-03dd7cdd6e51.png";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setError(error.message);
        return;
      }

      setSuccess(true);
      toast({
        title: "Reset email sent!",
        description: "Check your email for password reset instructions.",
      });
    } catch (error: any) {
      setError("An unexpected error occurred. Please try again.");
      console.error("Password reset error:", error);
    } finally {
      setLoading(false);
    }
  };

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
            <CardTitle className="text-2xl font-bold">Reset your password</CardTitle>
            <CardDescription>
              Enter your email address and we'll send you a reset link
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
                <p className="text-sm text-green-500">
                  Password reset email sent! Check your inbox and follow the instructions.
                </p>
              </div>
            )}

            {!success ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-input/50"
                  />
                </div>

                <Button type="submit" className="w-full security-glow" disabled={loading}>
                  <Mail className="w-4 h-4 mr-2" />
                  {loading ? "Sending Reset Email..." : "Send Reset Email"}
                </Button>
              </form>
            ) : (
              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  Didn't receive the email? Check your spam folder or try again in a few minutes.
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSuccess(false);
                    setEmail("");
                  }}
                  className="w-full"
                >
                  Send Another Email
                </Button>
              </div>
            )}

            <div className="mt-6 text-center">
              <Link 
                to="/login" 
                className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary-glow transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Sign In
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            For security reasons, we'll only send reset emails to registered accounts.
          </p>
        </div>
      </div>
    </div>
  );
}