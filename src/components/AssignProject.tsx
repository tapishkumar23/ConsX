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
};

const AssignProject = ({ role, user }: any) => {
  const [users, setUsers] = useState<UserType[]>([]);
  const [projects, setProjects] = useState<ProjectType[]>([]);

  const [form, setForm] = useState({
    title: "",
    description: "",
    assigned_to: "",
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
      if (!form.title || !form.description || !form.assigned_to) {
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

      await fetch("http://localhost:5000/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: selectedUser.email,
          subject: `📌 New Project Assigned: ${form.title}`,
          message: form.description,
          attachment: fileUrl,
          assigned_by_name: user.name,
        }),
      });

      alert("✅ Project assigned successfully");

      setForm({ title: "", description: "", assigned_to: "" });
      setFile(null);

    } catch (err) {
      console.error(err);
      alert("❌ Error assigning project");
    }
  };

  // 🔥 FINAL UI
  return (
    <div className="space-y-6">

      {/* 🔥 PROJECTS (VISIBLE TO ALL) */}
      <div className="bg-white p-5 rounded-xl shadow">
        <h2 className="font-semibold mb-4">Projects</h2>

        {projects.length === 0 && (
          <p className="text-gray-500 text-sm">
            No projects found
          </p>
        )}

        {projects.map((p) => (
          <div key={p.id} className="border border-gray-200 p-4 mb-4 rounded-xl shadow-sm hover:shadow-md transition bg-white">
            <h3 className="font-semibold text-[#0B3D2E] text-lg">{p.title}</h3>

            <p className="text-sm text-gray-600 mt-1">{p.description}</p>

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
        <div className="bg-white p-5 rounded-xl shadow">
          <h2 className="font-semibold mb-4">
            Assign Project via Mail
          </h2>

          <input
            className="w-full mb-3 p-2 border rounded"
            placeholder="Title"
            value={form.title}
            onChange={(e) =>
              setForm({ ...form, title: e.target.value })
            }
          />

          <textarea
            className="w-full mb-3 p-2 border rounded"
            placeholder="Description"
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
          />

          <select
            className="w-full mb-3 p-2 border rounded"
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

          <input
            type="file"
            className="mb-3"
            onChange={(e) =>
              setFile(e.target.files?.[0] || null)
            }
          />

          <button
            onClick={handleSubmit}
            className="bg-[#0B3D2E] text-white px-4 py-2 rounded"
          >
            Send Project
          </button>
        </div>
      )}

    </div>
  );
};

export default AssignProject;