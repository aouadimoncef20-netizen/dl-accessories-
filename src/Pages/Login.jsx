import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import useAuthStore from "../stores/authStore";
import SEO from "../Component/SEO";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuthStore();
  const from = location.state?.from?.pathname || "/account";
  const isAdminLogin = from.startsWith("/admin");
  const [email, setEmail] = useState(
    isAdminLogin ? "zaki1@dlaccessories.com" : ""
  );
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn(email, password);
      // Someone who signs in with the store-admin account from the generic
      // login page belongs on the dashboard, not on the customer account page.
      const signedInAsAdmin = useAuthStore.getState().isAdmin;
      navigate(signedInAsAdmin && from === "/account" ? "/admin" : from, {
        replace: true,
      });
    } catch (err) {
      setError(err?.message || "Sign-in failed. Please try again.");
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
          <h1 className="font-headline-md text-headline-md text-center mb-2">
            {isAdminLogin ? "Admin Sign In" : "Welcome Back"}
          </h1>
          <p className={`text-secondary text-center font-body-md ${isAdminLogin ? "mb-2" : "mb-8"}`}>
            {isAdminLogin ? "Sign in to manage your store" : "Sign in to your account"}
          </p>
          {isAdminLogin && (
            <p className="text-center text-xs text-secondary mb-8 font-label-sm">
              Store admin email:{" "}
              <span className="text-on-surface">zaki1@dlaccessories.com</span>
            </p>
          )}

          {error && (
            <div role="alert" className="bg-error-container/50 text-error rounded-xl p-4 mb-6 font-label-sm">
              <p>{error}</p>
              {isAdminLogin && (
                <p className="mt-2 text-secondary">
                  Check the email: the store admin is zaki1@dlaccessories.com
                  (admin@dlaccessories.com also works). Use “Show password” to
                  check for a typo.
                </p>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="font-label-sm text-on-surface-variant uppercase tracking-wider mb-1 block">Email</label>
              <input type="email" name="email" value={email} onChange={(e) => setEmail(e.target.value)}
                autoComplete="email" autoCapitalize="none" autoCorrect="off" spellCheck="false"
                className="w-full form-input font-body-md" placeholder="you@example.com" required />
            </div>
            <div>
              <label className="font-label-sm text-on-surface-variant uppercase tracking-wider mb-1 block">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  className="w-full form-input font-body-md pe-12"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 end-0 flex w-12 items-center justify-center rounded-e-lg text-secondary hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                >
                  <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
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
