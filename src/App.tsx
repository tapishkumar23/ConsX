import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import UserDetails from "./pages/UserDetails";
import LeaveManager from "./pages/LeaveManager";
import HRLeaves from "./pages/HRLeaves";
import CompanyPolicies from "./components/Policies";

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

          {/* Leave Manager */}
          <Route
            path="/leave-manager"
            element={
              <ProtectedRoute>
                <LeaveManager />
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

          {/* Policies */}
          <Route
            path="/policies"
            element={<CompanyPolicies />}
          />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;