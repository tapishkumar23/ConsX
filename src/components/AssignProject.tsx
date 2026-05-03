import { useEffect, useState } from "react";
import { supabase } from "../Supabase/supabase";


// 🔥 TYPES
type UserType = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type ProjectType = {
  id: string;
  title: string;
  description: string;
  attachment_url?: string;
  assigned_to: string;
  assigned_by: string;
  created_at: string;
  deadline?: string;
  assigned_to_user?: {
    name: string;
  };

  assigned_by_user?: {
    name: string;
  };
};

const AssignProject = ({ role, user }: any) => {
  const [users, setUsers] = useState<UserType[]>([]);
  const [projects, setProjects] = useState<ProjectType[]>([]);

  const [form, setForm] = useState({
    title: "",
    description: "",
    assigned_to: "",
    deadline: "", 
  });

  const [file, setFile] = useState<File | null>(null);

  const isEmployee =
    role === "employee" || role === "backend_employee";

  // 🔥 Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      let query = supabase.from("users").select("*");

      if (role === "manager") {
        query = query.in("role", ["employee", "backend_employee"]);
      }

      if (role === "ceo") {
        query = query.neq("id", user.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Fetch users error:", error);
        return;
      }

      setUsers(data || []);
    };

    if (!isEmployee) fetchUsers();
  }, [role, user]);

  // 🔥 Fetch projects
  useEffect(() => {
    const fetchProjects = async () => {
      if (!user) return;

      let query = supabase
        .from("project_assignments")
        .select(`*,
        assigned_to_user:assigned_to (name),
        assigned_by_user:assigned_by (name)
        `)
        .order("created_at", { ascending: false });

      if (role === "employee" || role === "backend_employee") {
        query = query.eq("assigned_to", user.id);
      } else if (role === "manager") {
        query = query.or(
          `assigned_to.eq.${user.id},assigned_by.eq.${user.id}`
        );
      }
      // CEO → no filter

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching projects:", error);
      } else {
        setProjects(data || []);
      }
    };

    fetchProjects();
  }, [user, role]);

  // 🔥 Submit handler
  const handleSubmit = async () => {
    let fileUrl = "";

    try {
      if (!form.title || !form.description || !form.assigned_to || !form.deadline) {
        alert("Please fill all fields");
        return;
      }

      if (file) {
        const filePath = `project/${Date.now()}_${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from("company_storage")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from("company_storage")
          .getPublicUrl(filePath);

        fileUrl = data.publicUrl;
      }

      await supabase.from("project_assignments").insert([
        {
          title: form.title,
          description: form.description,
          assigned_to: form.assigned_to,
          assigned_by: user.id,
          attachment_url: fileUrl,
          deadline: form.deadline,
        },
      ]);

      await supabase.from("notifications").insert([
        {
          user_id: form.assigned_to,
          message: `New project assigned: ${form.title}`,
        },
      ]);

      const selectedUser = users.find(
        (u) => u.id === form.assigned_to
      );

      if (!selectedUser?.email) return;

      await fetch("https://consx.onrender.com/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: selectedUser.email,
          subject: `📌 New Project Assigned: ${form.title}`,
          message: form.description,
          attachment: fileUrl,
          assigned_by_name: user.name,
          deadline: form.deadline, 
        }),
      });

      alert("✅ Project assigned successfully");

      setForm({ title: "", description: "", assigned_to: "", deadline: "" });
      setFile(null);

    } catch (err) {
      console.error(err);
      alert("❌ Error assigning project");
    }
  };

  // 🔥 FINAL UI
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

      {/* 🔥 PROJECTS (VISIBLE TO ALL) */}
      <div className="lg:col-span-2 bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-gray-200 shadow-sm max-h-[500px] overflow-y-auto">
        <h2 className="text-lg font-semibold text-gray-800 mb-5">Projects</h2>

        {projects.length === 0 && (
          <p className="text-gray-500 text-sm">
            No projects found
          </p>
        )}

        {projects.map((p) => (
          <div key={p.id} className="group p-5 mb-4 rounded-2xl border border-gray-200 bg-white hover:shadow-lg transition-all duration-200">
            <h3 className="font-semibold text-lg text-gray-900 group-hover:text-[#0B3D2E] transition"> </h3>

            <p className="text-sm text-gray-500 mt-2 leading-relaxed">{p.description}</p>

            <p className={`text-sm font-semibold mt-1 ${
              p.deadline && new Date(p.deadline) < new Date()
                ? "text-red-700"
                : "text-red-500"
            }`}>
              Deadline: {p.deadline 
                ? new Date(p.deadline).toLocaleDateString()
                : "Not set"}
            </p>


            <span className="font-semibold text-gray-800">
            Assigned to: {p.assigned_to_user?.name || "N/A"}
            </span>
            <p></p>
            <span className="font-semibold text-gray-800">
            Assigned by: {p.assigned_by_user?.name || "N/A"}
            </span>

            <p></p>

            {p.attachment_url && (
              <a href={p.attachment_url} target="_blank" className="inline-block text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline transition">
                ⬇ Download Attachment
              </a>
            )}
          </div>
        ))}
      </div>

      {/* 🔥 ONLY CEO / MANAGER CAN ASSIGN */}
      {!isEmployee && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <h2 className="font-semibold mb-4">
            Assign Project via Mail
          </h2>

          <input
            className="w-full mb-4 px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0B3D2E] focus:outline-none transition"
            placeholder="Title"
            value={form.title}
            onChange={(e) =>
              setForm({ ...form, title: e.target.value })
            }
          />

          <textarea
            className="w-full mb-4 px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0B3D2E] focus:outline-none transition"
            placeholder="Description"
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
          />

          <select
            className="w-full mb-4 px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0B3D2E] focus:outline-none transition"
            value={form.assigned_to}
            onChange={(e) =>
              setForm({ ...form, assigned_to: e.target.value })
            }
          >
            <option value="">Select User</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.role})
              </option>
            ))}
          </select>

          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">
              Deadline
            </label>
            <input
              type="date"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0B3D2E]"
              value={form.deadline}
              onChange={(e) =>
                setForm({ ...form, deadline: e.target.value })
              }
            />
          </div>

          <input
            type="file"
            className="mb-3"
            onChange={(e) =>
              setFile(e.target.files?.[0] || null)
            }
          />

          <button
            onClick={handleSubmit}
             className="w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-900 transition shadow-sm"
          >
            Send Project
          </button>
        </div>
      )}

    </div>
  );
};

export default AssignProject;
