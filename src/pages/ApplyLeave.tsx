import { useEffect, useState } from "react";
import { supabase } from "../Supabase/supabase";
import { useNavigate } from "react-router-dom";

const ApplyLeave = () => {
  const navigate = useNavigate();

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const [totalLeaves, setTotalLeaves] = useState(0);
  const [takenLeaves, setTakenLeaves] = useState(0);

  // ✅ FETCH LEAVE DATA
  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) return;

      // total leaves
      const { data: userData } = await supabase
        .from("users")
        .select("leave_balance")
        .eq("id", user.id)
        .single();

      setTotalLeaves(userData?.leave_balance || 0);

      // taken leaves
      const { data: leaves } = await supabase
        .from("leaves")
        .select("from_date, to_date, reason, status")
        .eq("user_id", user.id)
        .eq("status", "approved");

      let total = 0;

      (leaves || []).forEach((l) => {
        const isHalfDay =
          l.reason?.toLowerCase().includes("half day");

        if (isHalfDay) {
          total += 0.5;
        } else {
          const from = new Date(l.from_date);
          const to = new Date(l.to_date);

          const diff =
            (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24) + 1;

          total += diff;
        }
      });

      setTakenLeaves(total);
    };

    fetchData();
  }, []);

  const remaining = totalLeaves - takenLeaves;

  // ✅ COLOR LOGIC
  const getLeaveColor = () => {
    if (remaining <= 5) return "from-red-400 to-red-500 text-white";
    if (remaining <= 10) return "from-yellow-400 to-yellow-500 text-black";
    return "from-emerald-400 to-emerald-500 text-black";
  };

  const handleSubmit = async () => {
    if (!fromDate || !toDate || !reason) {
      alert("Please fill all fields");
      return;
    }

    setLoading(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;

      if (!user) {
        alert("User not found");
        return;
      }

      const { error } = await supabase.from("leaves").insert([
        {
          user_id: user.id,
          from_date: fromDate,
          to_date: toDate,
          reason: reason,
        },
      ]);

      if (error) {
        alert("Failed to apply leave");
        return;
      }

      // 🔥 NOTIFICATIONS LOGIC

      const { data: currentUser } = await supabase
        .from("users")
        .select("role, name")
        .eq("id", user.id)
        .single();

      const role = currentUser?.role?.trim().toLowerCase();
      const userName = currentUser?.name || "Employee";

      const { data: allUsers } = await supabase
        .from("users")
        .select("id, role");

      let approvers: any[] = [];

      if (!["hr", "ceo", "manager"].includes(role)) {
        approvers = (allUsers || []).filter((u) =>
          ["hr", "ceo"].includes(u.role?.trim().toLowerCase())
        );
      } else if (role === "hr" || role === "manager") {
        approvers = (allUsers || []).filter(
          (u) => u.role?.trim().toLowerCase() === "ceo"
        );
      }

      if (approvers.length > 0) {
        const notifications = approvers.map((u) => ({
          user_id: u.id,
          message: `${userName} applied for leave`,
        }));

        await supabase.from("notifications").insert(notifications);
      }

      alert("Leave applied successfully!");
      navigate("/");
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-gray-100 via-gray-200 to-gray-100">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* ✅ LEAVE SUMMARY */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

          <div className="bg-gradient-to-br from-gray-900 to-black text-white p-5 rounded-2xl shadow-md">
            <p className="text-xs opacity-70">Total Leaves</p>
            <p className="text-2xl font-semibold mt-2">{totalLeaves}</p>
          </div>

          <div className="bg-gradient-to-br from-yellow-400 to-yellow-500 text-black p-5 rounded-2xl shadow-md">
            <p className="text-xs opacity-70">Leaves Taken</p>
            <p className="text-2xl font-semibold mt-2">{takenLeaves}</p>
          </div>

          <div className={`p-5 rounded-2xl shadow-md bg-gradient-to-br ${getLeaveColor()}`}>
            <p className="text-xs opacity-70">Leaves Remaining</p>
            <p className="text-2xl font-semibold mt-2">{remaining}</p>
          </div>

        </div>

        {/* ✅ FORM */}
        <div className="bg-white p-6 rounded-2xl shadow-md">
          <h2 className="text-xl font-semibold mb-4">Apply for Leave</h2>

          <label className="text-sm">From Date</label>
          <input
            type="date"
            className="w-full mb-3 p-2 border rounded"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />

          <label className="text-sm">To Date</label>
          <input
            type="date"
            className="w-full mb-3 p-2 border rounded"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />

          <label className="text-sm">Reason</label>
          <textarea
            className="w-full mb-4 p-2 border rounded"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />

          <button
            onClick={handleSubmit}
            className="w-full bg-black text-white py-2 rounded hover:bg-gray-800"
            disabled={loading}
          >
            {loading ? "Submitting..." : "Apply Leave"}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ApplyLeave;