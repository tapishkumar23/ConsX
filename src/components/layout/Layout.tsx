import { useState } from "react";
import type { ReactNode } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

interface LayoutProps {
  children: ReactNode;
  fullBleed?: boolean; // skips the max-w + padding wrapper
}

const Layout = ({ children, fullBleed = false }: LayoutProps) => {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <div className="flex h-screen bg-gray-100">

      {/* SIDEBAR */}
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      {/* BACKDROP */}
      {!collapsed && (
        <div
          onClick={() => setCollapsed(true)}
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30"
        />
      )}

      {/* RIGHT SIDE */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* NAVBAR */}
        <div className="h-16 flex-shrink-0 bg-gradient-to-r from-gray-900 to-black border-b border-gray-200">
          <Navbar toggleSidebar={() => setCollapsed(!collapsed)} />
        </div>

        {/* MAIN CONTENT */}
        <main className="flex-1 overflow-y-auto">
          {fullBleed ? (
            // Full width, no padding — for pages like Policies, UserDetails
            children
          ) : (
            // Normal padded layout — for Dashboard and other pages
            <div className="max-w-7xl mx-auto p-6 space-y-6">
              {children}
            </div>
          )}
        </main>

      </div>
    </div>
  );
};

export default Layout;