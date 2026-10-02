import { useState } from "react";
import { Link } from "react-router-dom";
import useAuthStore from "../stores/authStore";
import SEO from "../Component/SEO";

const SUPPORT_EMAIL = "dl.accessoires@gmail.com";

function ForgotPassword() {
  const { resetPassword } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email, password);
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    "Password reset"
  )}&body=${encodeURIComponent(
    `My account email is: ${email || "(your email)"}\n\nI can't sign in and I'd like to reset my password.`
  )}`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-margin-mobile py-32">
      <SEO title="Reset Password" description="Set a new password for your DL Accessories account." />
      <div className="w-full max-w-md">
        <Link to="/" className="block text-center mb-12">
          <span className="font-display-lg text-[28px] text-primary">DL Accessories</span>
        </Link>

        <div className="bg-surface rounded-3xl p-8 md:p-10 soft-glow">
          <h1 className="font-headline-md text-headline-md text-center mb-2">Reset Password</h1>

          {done ? (
            <>
              <p className="text-secondary text-center mb-8 font-body-md">
                Your password has been changed. You can sign in with it now.
              </p>
              <Link
                to="/login"
                className="block w-full text-center py-4 bg-primary text-on-primary rounded-full font-label-md uppercase tracking-widest hover:opacity-90 transition-opacity"
              >
                Sign In
              </Link>
            </>
          ) : (
            <>
              <p className="text-secondary text-center mb-8 font-body-md">
                Your account lives in the browser you signed up with, so we can't
                email you a reset link. Enter your email and pick a new password.
              </p>

              {error && (
                <div className="bg-error-container/50 text-error rounded-xl p-4 mb-6 font-label-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full form-input font-body-md"
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full form-input font-body-md"
                  placeholder="New password"
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full form-input font-body-md"
                  placeholder="Repeat new password"
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-primary text-on-primary rounded-full font-label-md uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Set New Password"}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-secondary">
                Signed up on another phone or browser?{" "}
                <a href={mailto} className="text-primary font-label-md underline underline-offset-4">
                  Email us
                </a>{" "}
                and we'll sort it out.
              </p>
            </>
          )}

          <p className="mt-6 text-center text-sm text-secondary">
            <Link to="/login" className="text-primary font-label-md">Back to Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
