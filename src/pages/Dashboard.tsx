import CalendarView from "../components/CalendarView";
import Layout from "../components/layout/Layout";
import Tasks from "../components/Tasks";
import CRM from "../components/CRM";
import CRMBoard from "../components/CRMBoard";

const Dashboard = () => {
  return (
    <Layout>
      <div className="p-6 bg-[#F5F7F6] min-h-screen space-y-8">

        {/* HEADER */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-[#0B3D2E] tracking-tight">
              Dashboard
            </h1>
            <p className="text-sm text-gray-600">
              Overview of operations and performance
            </p>
          </div>

          {/* subtle badge */}
          <div className="text-xs border border-[#C6A15B]/40 text-[#C6A15B] px-3 py-1 rounded-full">
            Live Data
          </div>
        </div>

        {/* TOP GRID (Calendar + Tasks) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Calendar (WIDER) */}
          <section className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-[#0B3D2E] font-semibold">Calendar</h2>
              <div className="w-2 h-2 rounded-full bg-[#C6A15B]"></div>
            </div>

            <div className="h-[1px] bg-gradient-to-r from-[#C6A15B]/30 to-transparent mb-4"></div>

            <CalendarView />
          </section>

          {/* Tasks (NARROWER) */}
          <section className="lg:col-span-1 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition max-h-[675px] overflow-y-auto">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-[#0B3D2E] font-semibold">Tasks</h2>
              <div className="w-2 h-2 rounded-full bg-[#C6A15B]"></div>
            </div>

            <div className="h-[1px] bg-gradient-to-r from-[#C6A15B]/30 to-transparent mb-4"></div>

            <Tasks />
          </section>
        </div>

        {/* CRM LIST */}
        <section className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-[#0B3D2E] font-semibold">CRM Leads</h2>
            <div className="w-2 h-2 rounded-full bg-[#C6A15B]"></div>
          </div>

          <div className="h-[1px] bg-gradient-to-r from-[#C6A15B]/30 to-transparent mb-4"></div>

          <CRM />
        </section>

        {/* PIPELINE */}
        <section className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
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