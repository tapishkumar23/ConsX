import { useEffect, useState } from "react";
import { supabase } from "../Supabase/supabase";
<<<<<<< HEAD
import Layout from "../components/layout/Layout";
=======
import { useNavigate } from "react-router-dom";

>>>>>>> 9f0b629299559226e4095baee2edbcfcff8a1e2d
const LeaveManager = () => {
  const navigate = useNavigate();

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");
  const [halfDay, setHalfDay] = useState(false);

  const [loading, setLoading] = useState(false);

  const [totalLeaves, setTotalLeaves] = useState(0);
  const [takenLeaves, setTakenLeaves] = useState(0);

  // ✅ Fetch user + leave stats
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
          l.reason?.toLowerCase().includes("half day") ||
          l.reason?.toLowerCase().includes("(half day)");

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

  // ✅ Submit
  const handleSubmit = async () => {
    if (!fromDate || (!halfDay && !toDate) || !reason) {
      alert("Fill required fields");
      return;
    }

    setLoading(true);

    try {
      const { data } = await supabase.auth.getUser();
      const user = data.user;

      if (!user) return;

      const { error } = await supabase.from("leaves").insert([
        {
          user_id: user.id,
          from_date: fromDate,
          to_date: halfDay ? fromDate : toDate,
          reason: halfDay ? `${reason} (HALF DAY)` : reason,
          status: "pending",
        },
      ]);

      if (error) {
        console.error("Insert error:", error);
        alert(error.message);
        return;
      }

      alert("Leave applied!");
      window.location.reload();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const remaining = totalLeaves - takenLeaves;

  const getLeaveColor = () => {
    if (remaining <= 5) return "text-red-500";
    if (remaining <= 10) return "text-yellow-500";
    return "text-green-500";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-200 to-gray-100">
      
      {/* HEADER */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="text-sm text-gray-500 hover:text-black transition"
          >
            ← Back
          </button>

          <span className="text-gray-300">|</span>

          <h1 className="text-lg font-semibold text-gray-900">
            Leave Management
          </h1>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-2xl mx-auto space-y-6">

          {/* ✅ SUMMARY */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border">
            <h2 className="text-lg font-semibold mb-4">Leave Summary</h2>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-gray-50 p-4 rounded-xl">
                <p className="text-xs text-gray-400">Total</p>
                <p className="text-lg font-semibold">{totalLeaves}</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl">
                <p className="text-xs text-gray-400">Taken</p>
                <p className="text-lg font-semibold">{takenLeaves}</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl">
                <p className="text-xs text-gray-400">Remaining</p>
                <p className={`text-lg font-semibold ${getLeaveColor()}`}>
                  {remaining}
                </p>
              </div>
            </div>
          </div>

          {/* ✅ FORM */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border">
            <h2 className="text-lg font-semibold mb-5">Apply Leave</h2>

            <label className="text-sm text-gray-600">From Date</label>
            <input
              type="date"
              className="w-full mb-4 px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />

            {!halfDay && (
              <>
                <label className="text-sm text-gray-600">To Date</label>
                <input
                  type="date"
                  className="w-full mb-4 px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </>
            )}

            {/* HALF DAY */}
            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                checked={halfDay}
                onChange={() => setHalfDay(!halfDay)}
              />
              <label className="text-sm text-gray-600">Half Day</label>
            </div>

            <label className="text-sm text-gray-600">Reason</label>
            <textarea
              className="w-full mb-5 px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400 resize-none"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />

            <button
              onClick={handleSubmit}
              className="w-full bg-black text-white py-2.5 rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Submitting..." : "Apply Leave"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaveManager;