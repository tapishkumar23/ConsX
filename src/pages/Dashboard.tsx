import CalendarView from "../components/CalendarView";
import Layout from "../components/layout/Layout";

const Dashboard = () => {
  return (
    <Layout>
      <div className="p-4 space-y-6">

        {/* Calendar */}
        <CalendarView />

      </div>
    </Layout>
  );
};

export default Dashboard;