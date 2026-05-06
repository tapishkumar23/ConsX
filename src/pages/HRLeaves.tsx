import { useEffect, useState } from "react";
import { supabase } from "../Supabase/supabase";
import Layout from "../components/layout/Layout";

const HRLeaves = () => {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("pending");


const fetchLeaves = async () => {
  const { data: currentUserData } = await supabase.auth.getUser();
  const currentUser = currentUserData?.user;

  if (!currentUser) return;

  // ✅ Get current role
  const { data: currentUserRole } = await supabase
    .from("users")
    .select("role")
    .eq("id", currentUser.id)
    .single();

  const role = currentUserRole?.role?.toLowerCase();

  let query = supabase
    .from("leaves")
    .select("*")
    .eq("status", activeTab)
    .order("created_at", { ascending: false });

  // ✅ HR should NOT see HR leave requests
  if (role === "hr") {
    const { data: hrUsers } = await supabase
      .from("users")
      .select("id")
      .eq("role", "hr");

    const hrIds = hrUsers?.map((u) => u.id) || [];

    if (hrIds.length > 0) {
      query = query.not("user_id", "in", `(${hrIds.join(",")})`);
    }
  }

  const { data: leavesData } = await query;

  if (!leavesData) return;

  // 🔥 Extract all user_ids
  const userIds = leavesData.map((l) => l.user_id);

  // 🔥 Fetch users
  const { data: usersData } = await supabase
    .from("users")
    .select("id, name")
    .in("id", userIds);

  // 🔥 Map userId → name
  const userMap: any = {};

  usersData?.forEach((u) => {
    userMap[u.id] = u.name;
  });

  // 🔥 Attach name to leaves
  const finalData = leavesData.map((leave) => ({
    ...leave,
    user_name: userMap[leave.user_id] || "Unknown",
  }));

  setLeaves(finalData);
};

  useEffect(() => {
    fetchLeaves();
  }, [activeTab]);

  const handleApprove = async (leave: any) => {
    try {
      const { id, user_id, from_date, to_date } = leave;

      // ✅ Get current HR user
      const { data: currentUserData } = await supabase.auth.getUser();
      const hrId = currentUserData?.user?.id;

      if (!hrId) {
        alert("HR user not found");
        return;
      }

      // ✅ Get HR name
      const { data: hrData, error: hrError } = await supabase
        .from("users")
        .select("name")
        .eq("id", hrId)
        .single();

      if (hrError) {
        console.error("HR fetch error:", hrError);
        return;
      }

      const hrName = hrData?.name || "HR";

      // ✅ Calculate days
      const from = new Date(from_date);
      const to = new Date(to_date);
      const days =
        Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      // ✅ Get employee balance
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("leave_balance, leaves_taken")
        .eq("id", user_id)
        .single();

      if (userError) {
        console.error("User fetch error:", userError);
        return;
      }

      if (user.leave_balance < days) {
        alert("Not enough leave balance");
        return;
      }

      // 🔥 UPDATE LEAVE (FIXED)
      const { error: updateError } = await supabase
        .from("leaves")
        .update({
          status: "approved",
          approved_by: hrId,
        })
        .eq("id", id);

      if (updateError) {
        console.error("Leave update error:", updateError);
        return;
      }

      // 🔥 UPDATE BALANCE
      const { error: balanceError } = await supabase
        .from("users")
        .update({
          leave_balance: user.leave_balance - days,
          leaves_taken: user.leaves_taken + days,
        })
        .eq("id", user_id);

      if (balanceError) {
        console.error("Balance update error:", balanceError);
        return;
      }

      // ✅ Add to calendar
      await supabase.from("events").insert([
        {
          title: "Leave",
          start_time: from_date,
          end_time: to_date,
          type: "leave",
          user_id: user_id,
        },
      ]);

      // ✅ Get CEO
      const { data: ceo } = await supabase
        .from("users")
        .select("id")
        .eq("role", "ceo")
        .single();

      // 🔥 Notifications (FIXED)
      const { error: notifError } = await supabase
        .from("notifications")
        .insert([
          {
            user_id: user_id,
            message: `Your leave has been approved by ${hrName}`,
          },
          {
            user_id: ceo?.id,
            message: `${hrName} approved a leave request`,
          },
        ]);

      if (notifError) {
        console.error("Notification error:", notifError);
      }

      alert("Leave approved!");
      fetchLeaves();
    } catch (err) {
      console.error("Approve error:", err);
    }
  };

  const handleReject = async (id: string, user_id: string) => {
    try {
      const { data: currentUserData } = await supabase.auth.getUser();
      const hrId = currentUserData?.user?.id;

      const { data: hrData } = await supabase
        .from("users")
        .select("name")
        .eq("id", hrId)
        .single();

      const hrName = hrData?.name || "HR";

      await supabase
        .from("leaves")
        .update({
          status: "rejected",
          approved_by: hrId,
        })
        .eq("id", id);

      await supabase.from("notifications").insert([
        {
          user_id: user_id,
          message: `Your leave has been rejected by ${hrName}`,
        },
      ]);

      fetchLeaves();
    } catch (err) {
      console.error("Reject error:", err);
    }
  };

  const getStatusStyle = (status: string) => {
  if (status === "approved")
    return "bg-green-100 text-green-700";
  if (status === "rejected")
    return "bg-red-100 text-red-700";
  return "bg-yellow-100 text-yellow-700";
};


  return (
    <Layout>
      <div className="p-6 min-h-screen bg-gray-100">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">
          Leave Requests
        </h2>
        <div className="flex gap-3 mb-6">
      {["pending", "approved", "rejected"].map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          className={`px-4 py-1.5 rounded-md text-sm capitalize transition
            ${
              activeTab === tab
                ? "bg-black text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
        >
          {tab}
        </button>
      ))}
    </div>
        {leaves.length === 0 ? (
          <div className="bg-white p-6 rounded-lg shadow text-center text-gray-500">
            No pending requests
          </div>
        ) : (
          <div className="grid gap-4">
            {leaves.map((leave) => {
              const from = new Date(leave.from_date).toLocaleDateString();
              const to = new Date(leave.to_date).toLocaleDateString();

              return (
                <div
                  key={leave.id}
                  className="bg-white rounded-xl shadow-md p-5 border border-gray-200 hover:shadow-lg transition"
                >
                  {/* Header */}
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">
                        {leave.user_name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {from} → {to}
                      </p>
                    </div>

                    <span className={`text-xs px-3 py-1 rounded-full ${getStatusStyle(leave.status)}`}>
      {                 leave.status}
                    </span>
                  </div>

                  {/* Reason */}
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium text-gray-700">Reason:</span>{" "}
                      {leave.reason}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => handleReject(leave.id, leave.user_id)}
                      className="px-4 py-1.5 text-sm rounded-md border border-red-500 text-red-600 hover:bg-red-50 transition"
                    >
                      Reject
                    </button>

                    <button
                      onClick={() => handleApprove(leave)}
                      className="px-4 py-1.5 text-sm rounded-md bg-green-600 text-white hover:bg-green-700 transition"
                    >
                      Approve
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
);
};

export default HRLeaves;