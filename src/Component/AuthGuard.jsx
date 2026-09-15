import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import useAuthStore from "../stores/authStore";

// ── Production security ──
// Set to false so only real admins can access /admin.
const DEV_ADMIN_BYPASS = false;

function AuthGuard({ children, requireAdmin = false }) {
  const { user, isAdmin, makeAdmin, loading } = useAuthStore();
  const location = useLocation();
  const [bypassing, setBypassing] = useState(false);

  if (loading || bypassing) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    if (DEV_ADMIN_BYPASS) {
      // Automatically grant admin to the current logged-in user
      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <div className="bg-surface rounded-3xl p-8 max-w-sm w-full soft-glow text-center">
            <span className="material-symbols-outlined text-[48px] text-primary mb-4 block">
              admin_panel_settings
            </span>
            <h2 className="font-headline-sm text-headline-sm text-on-surface mb-2">
              Admin Access
            </h2>
            <p className="font-body-md text-secondary mb-6">
              Enable admin mode to manage products and orders.
            </p>
            <button
              onClick={async () => {
                setBypassing(true);
                await makeAdmin();
                setBypassing(false);
              }}
              className="w-full py-3.5 rounded-xl bg-primary text-on-primary font-label-md uppercase tracking-wider hover:opacity-90 transition-opacity ripple"
            >
              Enable Admin Access
            </button>
          </div>
        </div>
      );
    }
    return <Navigate to="/" replace />;
  }

  return children;
}

export default AuthGuard;
