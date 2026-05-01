import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import UserDetails from "./pages/UserDetails";
import ApplyLeave from "./pages/ApplyLeave";
import HRLeaves from "./pages/HRLeaves";

import { AuthProvider } from "./pages/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* Dashboard */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* User Details */}
          <Route
            path="/user-details"
            element={
              <ProtectedRoute>
                <UserDetails />
              </ProtectedRoute>
            }
          />

          {/* Apply Leave */}
          <Route
            path="/apply-leave"
            element={
              <ProtectedRoute>
                <ApplyLeave />
              </ProtectedRoute>
            }
          />

          {/* HR Leave Approval */}
          <Route
            path="/hr-leaves"
            element={
              <ProtectedRoute>
                <HRLeaves />
              </ProtectedRoute>
            }
          />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;