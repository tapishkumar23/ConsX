import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../Supabase/supabase";
import { useAuth } from "../../pages/AuthContext";

const NAV_ITEMS = [
  {
    id: "home",
    label: "Home",
    path: "/",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    id: "policies",
    label: "Policies",
    path: "/policies",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
  },
  {
    id: "leave",
    label: "Leave",
    path: "/leave-manager",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
  },
];

const HR_NAV_ITEMS = [
  {
    id: "hr-panel",
    label: "HR Panel",
    path: "/hr-leaves",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
  },
  {
    id: "profiles",
    label: "Profiles",
    path: "/user-details",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

const Sidebar = ({
  collapsed,
  setCollapsed,
}: {
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [role, setRole] = useState<string>("");

  useEffect(() => {
    const fetch = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("users")
        .select("role, leave_balance")
        .eq("id", user.id)
        .single();
      if (data) {
        setRole(data.role?.trim().toLowerCase() ?? "employee");
      }
    };
    fetch();
  }, [user]);

  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  const isHRorCEO = role === "hr" || role === "ceo";


  return (
    <aside
      className={`fixed top-0 left-0 bottom-0 z-40 flex flex-col bg-white border-r border-gray-200 shadow-md transform transition-transform duration-300 ${
        collapsed ? "-translate-x-full" : "translate-x-0"
      } w-[240px]`}
    >
      {/* Brand — same height as Navbar (h-16) */}
      <div className="flex items-center px-4 h-16 border-b border-gray-200">
    {!collapsed && (
  <div className="flex items-center gap-3 pl-1">
    
    {/* BACK BUTTON */}
    <button
      onClick={() => setCollapsed(true)}
      className="p-2 rounded-md hover:bg-gray-100 transition"
    >
      <svg
        className="w-4 h-4 text-gray-700"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
    </button>

    {/* TITLE */}
    <span className="text-gray-900 font-semibold text-sm">
      Sidebar
    </span>

  </div>
)}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {!collapsed && (
          <p className="text-[10px] text-gray-500 uppercase tracking-widest px-2 pb-2 font-medium">
            Main
          </p>
        )}

        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            title={collapsed ? item.label : undefined}
            className={`w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-sm transition-all ${
              isActive(item.path)
                ? "bg-gray-900 text-white font-medium"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            } ${collapsed ? "justify-center" : ""}`}
          >
            <span className="flex-shrink-0">{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}

        {isHRorCEO && (
          <>
            <div className={`${collapsed ? "border-t border-gray-200 mx-1 my-3" : "pt-4 pb-1"}`}>
              {!collapsed && (
                <p className="text-[10px] text-gray-600 uppercase tracking-widest px-2 font-medium">
                  Management
                </p>
              )}
            </div>

            {HR_NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-sm transition-all ${
                  isActive(item.path)
                    ? "bg-white text-gray-900 font-medium shadow-sm"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                } ${collapsed ? "justify-center" : ""}`}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </button>
            ))}
          </>
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;
