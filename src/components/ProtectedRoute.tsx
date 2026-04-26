import { useAuth } from "../pages/AuthContext";
import Auth from "../pages/Auth";

const ProtectedRoute = ({ children }: any) => {
  const { session, loading } = useAuth();

  // ✅ still loading
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  // ❌ no session → go to auth
  if (!session) {
    return <Auth />;
  }

  // ✅ authenticated
  return children;
};

export default ProtectedRoute;