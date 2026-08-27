import { useState } from "react";
import { Link } from "react-router-dom";
import useAuthStore from "../stores/authStore";
import SEO from "../Component/SEO";

function ForgotPassword() {
  const { resetPassword } = useAuthStore();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-margin-mobile">
      <SEO title="Reset Password" description="Reset your DL Accessories password." />
      <div className="w-full max-w-md">
        <Link to="/" className="block text-center mb-12">
          <span className="font-display-lg text-[28px] text-primary">DL Accessories</span>
        </Link>

        <div className="bg-surface rounded-3xl p-8 md:p-10 soft-glow">
          <h1 className="font-headline-md text-headline-md text-center mb-2">Reset Password</h1>
          <p className="text-secondary text-center mb-8 font-body-md">
            {sent ? "Check your email for the reset link." : "Enter your email and we'll send you a reset link."}
          </p>

          {error && <div className="bg-error-container/50 text-error rounded-xl p-4 mb-6 font-label-sm">{error}</div>}

          {!sent && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full form-input font-body-md" placeholder="you@example.com" required />
              <button type="submit" disabled={loading}
                className="w-full py-4 bg-primary text-on-primary rounded-full font-label-md uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50">
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
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
