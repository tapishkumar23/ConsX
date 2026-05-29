import { useEffect, useState } from "react";
import { useAuth } from "../pages/AuthContext";
import { supabase } from "../Supabase/supabase";
import AnnouncementBanner from "../components/AnnouncementBanner";
import CreateAnnouncement from "../components/CreateAnnouncement";
import CalendarView from "../components/CalendarView";
import Layout from "../components/layout/Layout";
import Tasks from "../components/Tasks";
import UpcomingMeetings from "../components/UpcomingMeetings";
import CRM from "../components/CRM";
import CRMBoard from "../components/CRMBoard";
import AssignProject from "../components/AssignProject";
import SalesLeaderboard from "../components/SalesLeaderboard";

const Dashboard = () => {
  const { user } = useAuth();
  const [role, setRole] = useState<string>("");
  const [showLeaderboard, setShowLeaderboard] = useState(false);

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
    <div className="p-4 sm:p-6 min-h-screen space-y-6 sm:space-y-8">
    {/* ANNOUNCEMENTS */}
    {user && (
      <AnnouncementBanner
        userId={user.id}
        role={role}
      />
    )}

    {/* CEO PANEL */}
    {role === "ceo" && (
      <CreateAnnouncement user={user} />
    )}

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

      {/* UPCOMING MEETINGS */}
      <section className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition">
        <UpcomingMeetings />
      </section>

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

    {/* Floating gold medal — fixed to right edge, employee / manager / ceo only */}
    {(role === "employee" || role === "manager" || role === "ceo") && (
      <button
        onClick={() => setShowLeaderboard(true)}
        title="Sales Leaderboard"
        className="fixed right-5 top-[88px] z-30 group drop-shadow-xl hover:drop-shadow-2xl transition-all hover:scale-110 active:scale-95"
      >
        <svg width="58" height="58" viewBox="0 0 56 56" fill="none">
          {/* Outer glow ring */}
          <circle cx="28" cy="28" r="27" fill="#7A5C1E" opacity="0.2" />
          {/* Dark gold border */}
          <circle cx="28" cy="28" r="25" fill="#8B6014" />
          {/* Main gold */}
          <circle cx="28" cy="28" r="23" fill="#C6A15B" />
          {/* Mid gold */}
          <circle cx="28" cy="28" r="20.5" fill="#DDB96A" />
          {/* Bright inner */}
          <circle cx="28" cy="28" r="18" fill="#F0CC70" />
          {/* Star shadow */}
          <path d="M28 12L31.5 21.8H42L33.7 27.7L37.2 37.5L28 31.6L18.8 37.5L22.3 27.7L14 21.8H24.5L28 12Z" fill="#8B6014" />
          {/* Star highlight */}
          <path d="M28 15.5L30.8 23.8H39.5L32.8 28.5L35.6 36.8L28 32.1L20.4 36.8L23.2 28.5L16.5 23.8H25.2L28 15.5Z" fill="#C6A15B" />
        </svg>

        {/* Tooltip label */}
        <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 whitespace-nowrap bg-gray-900 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          Sales Leaderboard
        </span>
      </button>
    )}

    {showLeaderboard && (
      <SalesLeaderboard onClose={() => setShowLeaderboard(false)} />
    )}
  </Layout>
);};

export default Dashboard;
