import { useEffect, useState, useRef } from "react";
import { supabase } from "../../Supabase/supabase";
import { useNavigate, useLocation } from "react-router-dom";

const PAGE_TITLES: Record<string, string> = {
  "/": "Office",
  "/policies": "Company Policies",
  "/apply-leave": "Leave Manager",
  "/hr-leaves": "HR Panel",
  "/user-details": "Employee Profiles",
};

const Navbar = ({ toggleSidebar }: { toggleSidebar: () => void }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);

  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const notificationRef = useRef<HTMLDivElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  const pageTitle =
    PAGE_TITLES[location.pathname] ??
    Object.entries(PAGE_TITLES).find(([path]) =>
      path !== "/" && location.pathname.startsWith(path)
    )?.[1] ??
    "Dashboard";

  /* ── fetch user ── */
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data.user) { setLoading(false); return; }

        const user = data.user;
        setUserId(user.id);

        const { data: userData } = await supabase
          .from("users")
          .select("name, role")
          .eq("id", user.id)
          .single();

        if (userData) {
          setName(userData.name || user.email || "User");
          setRole(userData.role?.trim().toLowerCase() || "employee");
        }
      } catch (err) {
        console.error("User fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  /* ── notifications ── */
  const fetchNotifications = async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (!error && data) setNotifications(data);
  };

  useEffect(() => {
    if (!userId) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("notifications-channel")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          if (payload.new.user_id === userId) {
            setNotifications((prev) => [payload.new, ...prev]);
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  /* ── close dropdowns on outside click / ESC ── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node))
        setShowNotifications(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node))
        setShowUserMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setShowNotifications(false); setShowUserMenu(false); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    fetchNotifications();
  };

  const markAllRead = async () => {
    const unread = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (!unread.length) return;
    await supabase.from("notifications").update({ is_read: true }).in("id", unread);
    fetchNotifications();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const initials = name
    ? name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "U";

  const roleLabel: Record<string, string> = {
    ceo: "CEO",
    hr: "HR",
    manager: "Manager",
    employee: "Employee",
    backend_employee: "Backend Employee",
  };

  return (
    <div className="h-16 flex items-center justify-between px-6 bg-gradient-to-r from-gray-900 to-black border-b border-white/5 flex-shrink-0 relative">

{/* CENTER LOGO */}
<div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 pointer-events-none">
  <img
    src="/altruity_marketing_group_logo.png"
    alt="Altruity"
    className="w-[180px] md:w-[220px] object-contain"
  />
</div>

<div className="flex items-center gap-4">
  
<button
  onClick={toggleSidebar}
  className="p-2 rounded-md hover:bg-white/10 transition"
>
  <svg
    className="w-5 h-5 text-white"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
  </svg>
</button>

  {/* ICON */}
  <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-white shadow-md">
    <img
      src="\altruity_marketing_group_icon.png"
      alt="icon"
      className="w-6 h-6 object-contain"
    />
  </div>


  {/* PAGE TITLE */}
  <h2 className="text-base font-semibold text-white tracking-wide">
    {pageTitle}
  </h2>

</div>

      {/* Right */}
      <div className="flex items-center gap-2">

        {/* ── Notification Bell ── */}
        <div ref={notificationRef} className="relative">
          <button
            onClick={() => { setShowNotifications(!showNotifications); setShowUserMenu(false); }}
            className="relative w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 text-[10px] font-bold flex items-center justify-center rounded-full bg-red-500 text-white leading-none">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Notification dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl z-50 overflow-hidden border border-gray-100">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="text-xs bg-red-100 text-red-600 font-medium px-1.5 py-0.5 rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-gray-400 hover:text-gray-700 transition"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {/* List */}
              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <svg className="w-8 h-8 text-gray-200 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0" />
                    </svg>
                    <p className="text-sm text-gray-400">No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markAsRead(n.id)}
                      className={`flex items-start gap-3 px-4 py-3 cursor-pointer border-b border-gray-50 transition hover:bg-gray-50 ${
                        !n.is_read ? "bg-blue-50/60" : ""
                      }`}
                    >
                      <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${!n.is_read ? "bg-blue-500" : "bg-gray-200"}`} />
                      <p className="text-sm text-gray-700 leading-snug">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-white/10 mx-1" />

        {/* ── User Menu ── */}
        <div ref={userMenuRef} className="relative">
          <button
            onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifications(false); }}
            className="flex items-center gap-2.5 pl-1 pr-3 py-1.5 rounded-lg hover:bg-white/10 transition"
          >
            {/* Avatar */}
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-500 to-gray-700 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
              {loading ? "…" : initials}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm text-white font-medium leading-none">
                {loading ? "Loading..." : name || "User"}
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5 leading-none capitalize">
                {roleLabel[role] ?? role}
              </p>
            </div>
            <svg className="w-3.5 h-3.5 text-gray-500 ml-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* User dropdown */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl z-50 overflow-hidden border border-gray-100 py-1">
              <button
                onClick={() => { navigate("/user-details"); setShowUserMenu(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                My Profile
              </button>

              <div className="border-t border-gray-100 my-1" />

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                </svg>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Navbar;
