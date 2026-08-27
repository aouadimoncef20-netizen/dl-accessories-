import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import useAuthStore from "../stores/authStore";
import SEO from "../Component/SEO";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || "/account";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-margin-mobile">
      <SEO title="Sign In" description="Sign in to your DL Accessories account." />
      <div className="w-full max-w-md">
        <Link to="/" className="block text-center mb-12">
          <span className="font-display-lg text-[28px] text-primary">DL Accessories</span>
        </Link>

        <div className="bg-surface rounded-3xl p-8 md:p-10 soft-glow">
          <h1 className="font-headline-md text-headline-md text-center mb-2">Welcome Back</h1>
          <p className="text-secondary text-center mb-8 font-body-md">Sign in to your account</p>

          {error && (
            <div className="bg-error-container/50 text-error rounded-xl p-4 mb-6 font-label-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="font-label-sm text-on-surface-variant uppercase tracking-wider mb-1 block">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full form-input font-body-md" placeholder="you@example.com" required />
            </div>
            <div>
              <label className="font-label-sm text-on-surface-variant uppercase tracking-wider mb-1 block">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full form-input font-body-md" placeholder="••••••••" required />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-4 bg-primary text-on-primary rounded-full font-label-md uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50">
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-6 text-center space-y-3">
            <Link to="/forgot-password" className="text-sm text-primary underline underline-offset-4 hover:opacity-80 transition-opacity block">
              Forgot your password?
            </Link>
            <p className="text-sm text-secondary">
              Don't have an account?{" "}
              <Link to="/register" className="text-primary font-label-md">Create one</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
