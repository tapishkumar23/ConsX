import Layout from "../components/layout/Layout";
import StatsCard from "./StatsCard";


const Dashboard = () => {
  return (
    <Layout>
      <h1 className="text-2xl font-bold">Welcome to Dashboard</h1>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-6">
        <StatsCard title="Revenue" value="$12,000" change="+12%" />
        <StatsCard title="Users" value="1,245" change="+5%" />
        <StatsCard title="Orders" value="320" change="+8%" />
      </div>
      
    </Layout>
  );
};

export default Dashboard;