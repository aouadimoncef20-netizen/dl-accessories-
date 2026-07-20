import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuthStore from "../stores/authStore";

function Register() {
  const navigate = useNavigate();
  const { signUp } = useAuthStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signUp(email, password, name);
      navigate("/account");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-margin-mobile">
      <div className="w-full max-w-md">
        <Link to="/" className="block text-center mb-12">
          <span className="font-display-lg text-[28px] text-primary">DL Accessories</span>
        </Link>

        <div className="bg-surface rounded-3xl p-8 md:p-10 soft-glow">
          <h1 className="font-headline-md text-headline-md text-center mb-2">Create Account</h1>
          <p className="text-secondary text-center mb-8 font-body-md">Join the DL Accessories community</p>

          {error && <div className="bg-error-container/50 text-error rounded-xl p-4 mb-6 font-label-sm">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="font-label-sm text-on-surface-variant uppercase tracking-wider mb-1 block">Full Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full form-input font-body-md" placeholder="Your name" required />
            </div>
            <div>
              <label className="font-label-sm text-on-surface-variant uppercase tracking-wider mb-1 block">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full form-input font-body-md" placeholder="you@example.com" required />
            </div>
            <div>
              <label className="font-label-sm text-on-surface-variant uppercase tracking-wider mb-1 block">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full form-input font-body-md" placeholder="Min. 6 characters" required minLength={6} />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-4 bg-primary text-on-primary rounded-full font-label-md uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50">
              {loading ? "Creating..." : "Create Account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-secondary">
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-label-md">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
