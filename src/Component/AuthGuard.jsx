import { Navigate, useLocation } from "react-router-dom";
import useAuthStore from "../stores/authStore";

function AuthGuard({ children, requireAdmin = false }) {
  const { user, isAdmin, loading } = useAuthStore();
  const location = useLocation();

  if (loading) {
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
    return <Navigate to="/" replace />;
  }

  return children;
}

export default AuthGuard;
