import CalendarView from "../components/CalendarView";
import Layout from "../components/layout/Layout";
import Tasks from "../components/Tasks"
import CRM from "../components/CRM";
import CRMBoard from "../components/CRMBoard";

const Dashboard = () => {
  return (
    <Layout>
      <div className="p-4 space-y-6">

        {/* Calendar */}
        <CalendarView />
       
        <Tasks />

        <CRM />

        <CRMBoard />


      </div>
    </Layout>
  );
};

export default Dashboard;