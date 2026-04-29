import { useEffect, useState } from "react";
import { supabase } from "../Supabase/supabase";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

const UserDetails = () => {
  const navigate = useNavigate();
  const { user, role } = useAuth();

  const [loading, setLoading] = useState(true);

  const [myProfile, setMyProfile] = useState<any>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const [form, setForm] = useState<any>({});

  /* =========================
     FETCH USERS (FIXED LOGIC)
  ========================== */
  const fetchUsers = async () => {
    if (!user || !role) {
      setLoading(false);
      return;
    }

    try {
      // 1️⃣ Always fetch YOURSELF
      const { data: me } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      setMyProfile(me);
      setSelectedUserId(user.id);

      // 2️⃣ Fetch others based on role
      let query = supabase.from("users").select("*").neq("id", user.id);

      if (role === "ceo" || role === "hr") {
        // see all others
      } else if (role === "manager") {
        query = query.in("role", ["employee", "backend_employee"]);
      } else {
        // employee sees no one else
        setTeamMembers([]);
        setLoading(false);
        return;
      }

      const { data, error } = await query;

      if (error) {
        console.error(error.message);
        setLoading(false);
        return;
      }

      setTeamMembers(data || []);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  /* =========================
     FETCH SELECTED USER
  ========================== */
  const fetchUserDetails = async () => {
    if (!selectedUserId) return;

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", selectedUserId)
      .single();

    if (error) {
      console.error(error.message);
      return;
    }

    setForm(data);
  };

  useEffect(() => {
    fetchUsers();
  }, [user, role]);

  useEffect(() => {
    if (selectedUserId) fetchUserDetails();
  }, [selectedUserId]);

  /* =========================
     HANDLE CHANGE
  ========================== */
  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /* =========================
     SAVE (HR ONLY)
  ========================== */
  const handleSave = async () => {
    if (role !== "hr") return;

    const { error } = await supabase
      .from("users")
      .update(form)
      .eq("id", selectedUserId);

    if (error) {
      console.error(error.message);
      return;
    }

    alert("Updated successfully");
    fetchUsers();
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-8">

      {/* TOP BAR */}
      <div className="flex justify-between mb-6">
        <button onClick={() => navigate("/")} className="text-sm">
          ← Back to Dashboard
        </button>

        <h1 className="font-semibold text-lg">Employee Profiles</h1>

        <div />
      </div>

      <div className="grid grid-cols-3 gap-6">

        {/* =========================
           LEFT PANEL
        ========================== */}
        <div className="space-y-6">

          {/* 👤 MY PROFILE */}
          <div className="bg-white p-4 rounded-xl border">
            <h2 className="text-xs text-gray-500 mb-2">My Profile</h2>

            <div
              onClick={() => setSelectedUserId(myProfile?.id)}
              className={`p-3 rounded-lg cursor-pointer ${
                selectedUserId === myProfile?.id
                  ? "bg-black text-white"
                  : "hover:bg-gray-100"
              }`}
            >
              <p className="text-sm font-medium">{myProfile?.name}</p>
              <p className="text-xs opacity-70">{myProfile?.role}</p>
            </div>
          </div>

          {/* 👥 TEAM MEMBERS */}
          <div className="bg-white p-4 rounded-xl border">
            <h2 className="text-xs text-gray-500 mb-2">Team Members</h2>

            <div className="space-y-2">
              {teamMembers.map((u) => (
                <div
                  key={u.id}
                  onClick={() => setSelectedUserId(u.id)}
                  className={`p-3 rounded-lg cursor-pointer ${
                    selectedUserId === u.id
                      ? "bg-black text-white"
                      : "hover:bg-gray-100"
                  }`}
                >
                  <p className="text-sm font-medium">{u.name}</p>
                  <p className="text-xs opacity-70">{u.role}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* =========================
           RIGHT PANEL (FORM)
        ========================== */}
        <div className="col-span-2 bg-white p-6 rounded-xl border">

          <h2 className="text-sm font-semibold mb-4">Profile Details</h2>

          <div className="grid grid-cols-2 gap-4">

            <div>
              <label className="text-xs">Full Name</label>
              <input
                name="name"
                value={form.name || ""}
                onChange={handleChange}
                disabled={role !== "hr"}
                className="input"
              />
            </div>

            <div>
              <label className="text-xs">Email</label>
              <input value={form.email || ""} disabled className="input bg-gray-100" />
            </div>

            <div>
              <label className="text-xs">Date of Birth</label>
              <input
                type="date"
                name="dob"
                value={form.dob || ""}
                onChange={handleChange}
                disabled={role !== "hr"}
                className="input"
              />
            </div>

            <div>
              <label className="text-xs">Phone</label>
              <input
                name="phone"
                value={form.phone || ""}
                onChange={handleChange}
                disabled={role !== "hr"}
                className="input"
              />
            </div>

            <div>
              <label className="text-xs">Department</label>
              <input
                name="department"
                value={form.department || ""}
                onChange={handleChange}
                disabled={role !== "hr"}
                className="input"
              />
            </div>

            <div>
              <label className="text-xs">Designation</label>
              <input
                name="designation"
                value={form.designation || ""}
                onChange={handleChange}
                disabled={role !== "hr"}
                className="input"
              />
            </div>

            <div>
              <label className="text-xs">Joining Date</label>
              <input
                type="date"
                name="joining_date"
                value={form.joining_date || ""}
                onChange={handleChange}
                disabled={role !== "hr"}
                className="input"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="text-xs">Address</label>
            <textarea
              name="address"
              value={form.address || ""}
              onChange={handleChange}
              disabled={role !== "hr"}
              className="input h-20"
            />
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={handleSave}
              disabled={role !== "hr"}
              className={`px-5 py-2 rounded ${
                role === "hr"
                  ? "bg-black text-white"
                  : "bg-gray-300 text-gray-500"
              }`}
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetails;