import CalendarView from "../components/CalendarView";
import Layout from "../components/layout/Layout";
import Tasks from "../components/Tasks";
import CRM from "../components/CRM";
import CRMBoard from "../components/CRMBoard";

const Dashboard = () => {
  return (
    <Layout>
      <div className="p-6 min-h-screen space-y-8 bg-gradient-to-br from-[#F8FAF9] via-[#EDF4F1] to-[#E8F0ED]">

        {/* TOP GRID */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* CALENDAR */}
          <section className="xl:col-span-2 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-[#0B3D2E] font-semibold">Calendar</h2>
              <div className="w-2 h-2 rounded-full bg-[#C6A15B]"></div>
            </div>

            <div className="h-[1px] bg-gradient-to-r from-[#C6A15B]/30 to-transparent mb-4"></div>

            <CalendarView />
          </section>

          {/* TASKS */}
          <section className="xl:col-span-1 bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition">

            <div className="flex justify-between items-center mb-3">
              <h2 className="text-[#0B3D2E] font-semibold">Tasks</h2>
              <div className="w-2 h-2 rounded-full bg-[#C6A15B]"></div>
            </div>

            <div className="h-[1px] bg-gradient-to-r from-[#C6A15B]/30 to-transparent mb-4"></div>

            {/* 🔥 IMPORTANT: remove card feel from Tasks */}
            <div className="space-y-4">
              <Tasks isCompact /> 
            </div>

          </section>
        </div>

        {/* CRM */}
        <section className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-[#0B3D2E] font-semibold">CRM Leads</h2>
            <div className="w-2 h-2 rounded-full bg-[#C6A15B]"></div>
          </div>

          <div className="h-[1px] bg-gradient-to-r from-[#C6A15B]/30 to-transparent mb-4"></div>

          <CRM />
        </section>

        {/* PIPELINE */}
        <section className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-[#0B3D2E] font-semibold">Sales Pipeline</h2>
            <div className="w-2 h-2 rounded-full bg-[#C6A15B]"></div>
          </div>

          <div className="h-[1px] bg-gradient-to-r from-[#C6A15B]/30 to-transparent mb-4"></div>

          <CRMBoard />
        </section>

      </div>
    </Layout>
  );
};

export default Dashboard;