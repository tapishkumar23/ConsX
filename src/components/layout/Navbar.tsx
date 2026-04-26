import { useEffect, useState } from "react";
import { supabase } from "../../Supabase/supabase";

const Navbar = () => {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();

      if (data.user) {
        const fallback = data.user.email || "User";

        const { data: userData, error } = await supabase
          .from("users")
          .select("name")
          .eq("id", data.user.id)
          .single();

        if (!error && userData?.name) {
          setName(userData.name);
        } else {
          setName(fallback);
        }
      }

      setLoading(false);
    };

    fetchUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="relative h-16 flex items-center justify-between px-8 text-white shadow-sm">

      {/* Base gradient (premium feel) */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0B3D2E] via-[#0E4A37] to-[#0B3D2E]"></div>

      {/* Soft light overlay */}
      <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px]"></div>

      {/* Content */}
      <div className="relative w-full flex items-center justify-between">

        {/* Left */}
        <h2 className="text-lg font-semibold tracking-tight text-white/95">
          Dashboard
        </h2>

        {/* Right */}
        <div className="flex items-center gap-5">

          {/* User */}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#C6A15B]"></div>
            <span className="text-sm text-white/90 font-medium">
              {loading ? "..." : name || "name"}
            </span>
          </div>

          {/* Divider */}
          <div className="h-4 w-px bg-white/20"></div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="text-xs px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 transition border border-white/20 backdrop-blur-sm"
          >
            Logout
          </button>

        </div>
      </div>

    </div>
  );
};

export default Navbar;