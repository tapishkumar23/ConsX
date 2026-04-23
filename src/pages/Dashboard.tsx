import CalendarView from "../components/CalendarView";
import Layout from "../components/layout/Layout";

const Dashboard = () => {
  return (
    <Layout>
      <div className="p-4 space-y-6">
        
        <h1 className="text-2xl font-bold">Welcome to Dashboard</h1>

        {/* Example stats row (optional ERP cards) */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl shadow">Employees: 120</div>
          <div className="bg-white p-4 rounded-xl shadow">Tasks: 32</div>
          <div className="bg-white p-4 rounded-xl shadow">Projects: 8</div>
        </div>

        {/* Calendar */}
        <CalendarView />

      </div>
    </Layout>
  );
};

export default Dashboard;