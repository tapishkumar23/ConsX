import { useEffect, useState, useRef } from "react";
import { supabase } from "../../Supabase/supabase";
import { useNavigate } from "react-router-dom";

const Navbar = () => {
  const [name, setName] = useState("");
  const [role, setRole] = useState(""); // ✅ NEW
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const notificationRef = useRef<HTMLDivElement | null>(null);

  // ✅ Fetch user + leave balance + role
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();

        if (error || !data.user) {
          setLoading(false);
          return;
        }

        const user = data.user;
        setUserId(user.id);

        const fallback = user.email || "User";

        const { data: userData, error: dbError } = await supabase
          .from("users")
          .select("name, role")
          .eq("id", user.id)
          .single();

        if (!dbError && userData) {
          setName(userData.name || fallback);
          setRole(userData.role?.trim().toLowerCase() || "employee");
        } else {
          setName(fallback);
        }
      } catch (err) {
        console.error("User fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  // ✅ Fetch notifications
  const fetchNotifications = async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setNotifications(data);
    }
  };

  // 🔄 Polling
  useEffect(() => {
    if (!userId) return;

    fetchNotifications();

    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, [userId]);

  // ⚡ Realtime updates
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("notifications-channel")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        (payload) => {
          if (payload.new.user_id === userId) {
            setNotifications((prev) => [payload.new, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // ✅ Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ⌨️ Close on ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowNotifications(false);
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  // ✅ Mark notification read
  const markAsRead = async (id: string) => {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);

    fetchNotifications();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="h-16 flex items-center justify-between px-8 bg-gradient-to-r from-gray-800 via-gray-900 to-black border-b border-gray-800 shadow-sm">
      
      {/* Left */}
      <h2 className="text-lg font-semibold tracking-tight text-white">
        Dashboard
      </h2>

      {/* Right */}
      <div className="flex items-center gap-5">

        {/* 🔔 Notifications */}
        <div ref={notificationRef} className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative text-gray-300 hover:text-white transition"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeWidth={1.8}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0"
              />
            </svg>

            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 text-[10px] flex items-center justify-center rounded-full bg-red-500 text-white">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 bg-white rounded-xl shadow-lg z-50 p-3">
              <h3 className="font-semibold text-gray-800 mb-2">
                Notifications
              </h3>

              {notifications.length === 0 ? (
                <p className="text-sm text-gray-500">No notifications</p>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => markAsRead(n.id)}
                    className={`p-2 rounded-md text-sm cursor-pointer mb-1 
                    ${n.is_read ? "bg-gray-100" : "bg-yellow-100"}
                    hover:bg-gray-200`}
                  >
                    {n.message}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Apply Leave */}
        <button
          onClick={() => navigate("/leave-manager")}
          className="text-sm text-gray-300 hover:text-white"
        >
          Leave Manager
        </button>

        {/* 🔥 HR PANEL (FIXED ISSUE) */}
        {["hr", "ceo"].includes(role) && (
          <button
            onClick={() => navigate("/hr-leaves")}
            className="text-sm text-gray-300 hover:text-white"
          >
            HR Panel
          </button>
        )}
        {/* Policies */}
          <button
            onClick={() => navigate("/policies")}
            className="text-sm text-gray-300 hover:text-white"
          >
            Policies
          </button>

        {/* User */}
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-gray-400"></div>

          <span
            onClick={() => navigate("/user-details")}
            className="text-sm text-gray-200 font-medium cursor-pointer hover:underline"
          >
            {loading ? "..." : name || "User"}
          </span>
        </div>

        <div className="h-4 w-px bg-gray-700"></div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="text-xs px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 border border-white/20 text-white"
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default Navbar;