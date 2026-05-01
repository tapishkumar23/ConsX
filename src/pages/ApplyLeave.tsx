import { useState } from "react";
import { supabase } from "../Supabase/supabase";
import { useNavigate } from "react-router-dom";

const ApplyLeave = () => {
  const navigate = useNavigate();

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

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

      // ✅ Insert leave request
      const { error } = await supabase.from("leaves").insert([
        {
          user_id: user.id,
          from_date: fromDate,
          to_date: toDate,
          reason: reason,
        },
      ]);

      if (error) {
        console.error(error);
        alert("Failed to apply leave");
        return;
      }

      // 🔥 NEW LOGIC STARTS HERE

      // ✅ Get current user role
      const { data: currentUser } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      const role = currentUser?.role;

      let approvers: any[] = [];

      if (role === "employee") {
        // Employee → HR + CEO
        const { data } = await supabase
          .from("users")
          .select("id")
          .in("role", ["hr", "ceo"]);

        approvers = data || [];
      } else if (role === "hr" || role === "manager") {
        // HR / Manager → CEO only
        const { data } = await supabase
          .from("users")
          .select("id")
          .eq("role", "ceo");

        approvers = data || [];
      }

      // ✅ Send notifications
      if (approvers.length > 0) {
        const notifications = approvers.map((u) => ({
          user_id: u.id,
          message: `New leave request from ${role}`,
        }));

        await supabase.from("notifications").insert(notifications);
      }

      // 🔥 NEW LOGIC ENDS HERE

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
    <div className="p-6 min-h-screen bg-gray-100">
      <div className="max-w-xl mx-auto bg-white p-6 rounded-xl shadow">
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
  );
};

export default ApplyLeave;