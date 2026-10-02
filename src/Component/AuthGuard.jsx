import { Link, Navigate, useLocation } from "react-router-dom";
import useAuthStore from "../stores/authStore";

// Admin rights come from signing in with the reserved admin account
// (src/lib/adminAuth.js). There is no bypass flag and no self-promotion
// button — see the note in src/stores/authStore.js.

function AuthGuard({ children, requireAdmin = false }) {
  const { user, isAdmin, loading, signOut } = useAuthStore();
  const location = useLocation();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not signed in → send to the login page, remembering where they wanted to go
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Signed in, but not the store admin. Say so plainly rather than
  // silently redirecting home (which just looks like the link is broken).
  if (requireAdmin && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-margin-mobile">
        <div className="bg-surface rounded-3xl p-8 max-w-md w-full soft-glow text-center">
          <span className="material-symbols-outlined text-[48px] text-primary mb-4 block">
            lock
          </span>
          <h2 className="font-headline-sm text-headline-sm text-on-surface mb-2">
            Admins only
          </h2>
          <p className="font-body-md text-secondary mb-1">
            You're signed in as{" "}
            <span className="text-on-surface break-all">{user.email}</span>
          </p>
          <p className="text-sm text-secondary mb-7">
            This area is for the store administrator. Sign in with the admin
            email to manage products and orders.
          </p>
          <div className="space-y-3">
            {/* Signing out clears the session, so this guard immediately
                redirects to /login and then back to /admin after sign-in. */}
            <button
              onClick={signOut}
              className="w-full py-3.5 rounded-xl bg-primary text-on-primary font-label-md uppercase tracking-wider hover:opacity-90 transition-opacity ripple"
            >
              Sign in as admin
            </button>
            <Link
              to="/"
              className="block w-full py-3.5 rounded-xl bg-surface-container text-on-surface font-label-md uppercase tracking-wider hover:bg-surface-container-high transition-colors"
            >
              Back to store
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return children;
}

export default AuthGuard;
