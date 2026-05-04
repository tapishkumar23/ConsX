import { useEffect, useState } from "react";
import { useAuth } from "../pages/AuthContext";
import { supabase } from "../Supabase/supabase";

import CalendarView from "../components/CalendarView";
import Layout from "../components/layout/Layout";
import Tasks from "../components/Tasks";
import CRM from "../components/CRM";
import CRMBoard from "../components/CRMBoard";
import AssignProject from "../components/AssignProject";

const Dashboard = () => {
  const { user } = useAuth();
  const [role, setRole] = useState<string>("employee");

  useEffect(() => {
    const fetchRole = async () => {
      if (!user) return;

      const { data } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (data?.role) {
        setRole(data.role);
      }
    };

    fetchRole();
  }, [user]);

  const isBackendEmployee = role === "backend_employee";

return (
  <Layout>
    <div className="p-4 sm:p-6 min-h-screen space-y-6 sm:space-y-8 bg-gradient-to-br from-gray-100 via-gray-200 to-gray-200">

      {/* TOP GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">

        {/* CALENDAR */}
        <section className="xl:col-span-2 bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition h-full flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm sm:text-base text-[#0B3D2E] font-semibold">Calendar</h2>
            <div className="w-2 h-2 rounded-full bg-[#C6A15B]"></div>
          </div>
          <div className="h-[1px] bg-gradient-to-r from-[#C6A15B]/30 to-transparent mb-4"></div>

          {/* prevent overflow on mobile */}
          <div className="w-full overflow-x-auto">
            <CalendarView />
          </div>
        </section>

        {/* TASKS */}
        <section className="xl:col-span-1 bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition flex flex-col h-[700px]">
          <Tasks />
        </section>
      </div>

      {/* ASSIGN PROJECT */}
      <section className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-sm">
        <AssignProject role={role} user={user} />
      </section>

      {!isBackendEmployee && (
        <>
          {/* CRM */}
          <section className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-sm sm:text-base text-[#0B3D2E] font-semibold">CRM Leads</h2>
              <div className="w-2 h-2 rounded-full bg-[#C6A15B]"></div>
            </div>
            <div className="h-[1px] bg-gradient-to-r from-[#C6A15B]/30 to-transparent mb-4"></div>

            <div className="w-full overflow-x-auto">
              <CRM />
            </div>
          </section>

          {/* PIPELINE */}
          <section className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-sm sm:text-base text-[#0B3D2E] font-semibold">Sales Pipeline</h2>
              <div className="w-2 h-2 rounded-full bg-[#C6A15B]"></div>
            </div>
            <div className="h-[1px] bg-gradient-to-r from-[#C6A15B]/30 to-transparent mb-4"></div>

            <div className="w-full overflow-x-auto">
              <CRMBoard />
            </div>
          </section>
        </>
      )}

    </div>
  </Layout>
);};

export default Dashboard;
