import { useAuth } from "@/_core/hooks/useAuth";
import { useState } from "react";
import { useLocation } from "wouter";
import { LayoutGrid } from "lucide-react";

export default function Login() {
  const { signIn, signUp, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  // Redirect if already authenticated
  if (isAuthenticated) {
    navigate("/crm");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "signin") {
        await signIn(email, password);
        navigate("/crm");
      } else {
        await signUp(email, password);
        setSignupSuccess(true);
      }
    } catch (err: any) {
      setError(err.message ?? "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[oklch(0.10_0.007_265)] flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-lg mx-auto mb-4 flex items-center justify-center bg-gradient-to-br from-[oklch(0.78_0.12_75)] to-[oklch(0.62_0.18_250)]">
            <LayoutGrid className="w-6 h-6 text-[oklch(0.10_0.008_265)]" />
          </div>
          <h1 className="font-display text-2xl text-white tracking-[0.15em]">
            GRIDWORKER <span className="text-[oklch(0.78_0.12_75)]">OS</span>
          </h1>
          <p className="text-[oklch(0.55_0.01_265)] text-sm mt-1">
            {mode === "signin" ? "Sign in to your account" : "Create your account"}
          </p>
        </div>

        {signupSuccess ? (
          <div className="rounded-xl p-6 text-center" style={{ background: "oklch(0.15 0.009 265)", border: "1px solid oklch(0.78 0.12 75 / 25%)" }}>
            <p className="text-[oklch(0.78_0.12_75)] font-semibold mb-2">Check your email</p>
            <p className="text-[oklch(0.55_0.01_265)] text-sm">
              We sent a confirmation link to <strong className="text-white">{email}</strong>. Click the link to activate your account.
            </p>
            <button
              onClick={() => { setMode("signin"); setSignupSuccess(false); }}
              className="mt-4 text-[oklch(0.78_0.12_75)] text-sm underline hover:no-underline">
              Back to sign in
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="rounded-xl p-6 flex flex-col gap-4" style={{ background: "oklch(0.15 0.009 265)", border: "1px solid oklch(0.22 0.009 265)" }}>
              <div>
                <label className="block text-[oklch(0.55_0.01_265)] text-xs uppercase tracking-widest mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder-[oklch(0.38_0.01_265)] outline-none focus:ring-1 focus:ring-[oklch(0.78_0.12_75/50%)]"
                  style={{ background: "oklch(0.12 0.008 265)", border: "1px solid oklch(0.25 0.009 265)" }}
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="block text-[oklch(0.55_0.01_265)] text-xs uppercase tracking-widest mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder-[oklch(0.38_0.01_265)] outline-none focus:ring-1 focus:ring-[oklch(0.78_0.12_75/50%)]"
                  style={{ background: "oklch(0.12 0.008 265)", border: "1px solid oklch(0.25 0.009 265)" }}
                  placeholder="Min. 6 characters"
                />
              </div>

              {error && (
                <p className="text-red-400 text-xs px-1">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
                style={{ background: "oklch(0.78 0.12 75)", color: "oklch(0.10 0.008 265)" }}>
                {loading ? (
                  <div className="w-4 h-4 mx-auto rounded-full border-2 border-current border-t-transparent animate-spin" />
                ) : mode === "signin" ? (
                  "Sign In"
                ) : (
                  "Create Account"
                )}
              </button>
            </div>

            <p className="text-center text-[oklch(0.50_0.01_265)] text-sm">
              {mode === "signin" ? (
                <>
                  Don't have an account?{" "}
                  <button type="button" onClick={() => { setMode("signup"); setError(null); }}
                    className="text-[oklch(0.78_0.12_75)] hover:underline">
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button type="button" onClick={() => { setMode("signin"); setError(null); }}
                    className="text-[oklch(0.78_0.12_75)] hover:underline">
                    Sign in
                  </button>
                </>
              )}
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
