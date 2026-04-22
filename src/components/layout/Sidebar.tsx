const Sidebar = () => {
  const menu = [
    { name: "Dashboard", path: "/" },
    { name: "Employees", path: "/employees" },
    { name: "Attendance", path: "/attendance" },
    { name: "Projects", path: "/projects" },
    { name: "Tasks", path: "/tasks" },
    { name: "Leaves", path: "/leaves" },
    { name: "Payroll", path: "/payroll" },
    { name: "Reports", path: "/reports" },
  ];

  return (
    <div className="w-64 h-screen bg-gray-900 text-white p-5">
      <h1 className="text-xl font-bold mb-6">My Dashboard</h1>

      <ul className="space-y-3">
        {menu.map((item, index) => (
          <li
            key={index}
            className="hover:text-blue-400 cursor-pointer"
          >
            {item.name}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Sidebar;