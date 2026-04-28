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
    <div className="h-16 flex items-center justify-between px-8 
      bg-gradient-to-r from-gray-800 via-gray-900 to-black 
      border-b border-gray-800 shadow-sm">

      {/* Left */}
      <h2 className="text-lg font-semibold tracking-tight text-white">
        Dashboard
      </h2>

      {/* Right */}
      <div className="flex items-center gap-5">

        {/* User */}
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-gray-400"></div>

          <span className="text-sm text-gray-200 font-medium">
            {loading ? "..." : name || "User"}
          </span>
        </div>
        
        {/* Divider */}
        <div className="h-4 w-px bg-gray-700"></div>
        
        {/* Logout */}
        <button
          onClick={handleLogout}
          className="text-xs px-3 py-1.5 rounded-md 
          bg-white/10 hover:bg-white/20 
          transition border border-white/20 text-white backdrop-blur-sm"
        >
          Logout
        </button>

      </div>
    </div>
  );
};

export default Navbar;