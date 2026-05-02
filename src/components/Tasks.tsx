import { useState, useEffect } from "react";
import { supabase } from "../Supabase/supabase";
import { useAuth } from "../pages/AuthContext";

type Status = "todo" | "in-progress" | "done";
type Priority = "low" | "medium" | "high";

type Task = {
  id: number;
  title: string;
  description: string;
  deadline: string;
  status: Status;
  priority: Priority;
  user_id: string; // creator
  assigned_to: string | null; // ✅ new field
  assigned_user?: {
    name: string;
  };
  created_by_user?: {
    name: string;
  };
  attachment_url?: string | null;
};

const Tasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const { user, role } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [status, setStatus] = useState<Status>("todo");
  const [priority, setPriority] = useState<Priority>("medium");

  const [assignedTo, setAssignedTo] = useState<string>(""); // ✅ new
  const [assignableUsers, setAssignableUsers] = useState<{ id: string; email: string; name: string }[]>([]);

  /* ✅ Fetch assignable users based on role */
  const fetchAssignableUsers = async () => {
  if (!user || !role) return;

  const { data, error } = await supabase
    .from("users")
    .select("id, email, role, name");

  if (error) {
    console.error("ASSIGNABLE USERS ERROR:", error.message);
    return;
  }

  let filteredUsers: typeof assignableUsers = [];

  if (role === "ceo") {
  // CEO → assign to everyone
  filteredUsers = data;
} 
else if (role === "manager") {
  // Manager → employees + self
  filteredUsers = data.filter(
    (u) => u.role === "employee" || u.id === user.id
  );
} 
else if (role === "hr") {
  // 🔥 HR → everyone except CEO
  filteredUsers = data.filter(
    (u) => u.role !== "ceo"
  );
} 
else {
  // employee / backend_employee → only themselves
  filteredUsers = data.filter((u) => u.id === user.id);
}

  setAssignableUsers(filteredUsers);
};

  /* ✅ Fetch tasks based on role */
  const fetchTasks = async () => {
    if (!user || !role) return;

    let query = supabase
  .from("tasks")
  .select("*")
  .order("id", { ascending: false });

  const { data: usersData } = await supabase
  .from("users")
  .select("id, name");

    if (role === "ceo") {
      // ceo can see all tasks
    } else if (role === "manager") {
      // manager sees tasks created by her or assigned to her
      query = query.or(`user_id.eq.${user.id},assigned_to.eq.${user.id}`);
    } else if (role === "employee" || role === "hr" || role === "backend_employee") {
      // employee sees tasks assigned to him
      query = query.or(`assigned_to.eq.${user.id},user_id.eq.${user.id}`);
    } else {
      query = query.eq("user_id", user.id);
    }

    const { data, error } = await query;
    if (error) {
      console.error("FETCH ERROR:", error.message);
      return;
    }

    const formatted = (data || []).map((t) => {
  const assignedUser = usersData?.find((u) => u.id === t.assigned_to);
  const createdByUser = usersData?.find((u) => u.id === t.user_id);

  return {
    ...t,
    deadline: t.deadline ? String(t.deadline) : "",
    assigned_user: assignedUser ? { name: assignedUser.name } : undefined,
    created_by_user: createdByUser ? { name: createdByUser.name } : undefined,
  };
});
    setTasks(formatted);
  };

  useEffect(() => {
    fetchTasks();
    fetchAssignableUsers(); // load assignable users for form
  }, [role, user]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDeadline("");
    setStatus("todo");
    setPriority("medium");
    setEditingId(null);
    setShowForm(false);
    setAssignedTo("");
  };

  // ✅ CREATE / UPDATE TASK (WITH ATTACHMENT)
const handleSubmit = async () => {
  if (!title || !user) return;

  let fileUrl = null;

  // 📎 Upload file
  if (file) {
    const fileName = `${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("task-attachments")
      .upload(fileName, file);

    if (uploadError) {
      console.error("FILE UPLOAD ERROR:", uploadError.message);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("task-attachments")
      .getPublicUrl(fileName);

    fileUrl = publicUrlData.publicUrl;
  }

  if (editingId) {
    const { error } = await supabase
      .from("tasks")
      .update({
        title,
        description,
        deadline: deadline || null,
        status,
        priority,
        assigned_to: assignedTo ? assignedTo : user.id,
        attachment_url: fileUrl ?? selectedTask?.attachment_url ?? null,
      })
      .eq("id", editingId);

    if (error) {
      console.error("UPDATE ERROR:", error.message);
      return;
    }
  } else {
    const { error } = await supabase.from("tasks").insert([
      {
        title,
        description,
        deadline: deadline || null,
        status,
        priority,
        user_id: user.id,
        assigned_to: assignedTo ? assignedTo : user.id,
        attachment_url: fileUrl,
      },
    ]);

    if (error) {
      console.error("INSERT ERROR:", error.message);
      return;
    }

    // 🔔 Notification
    if (assignedTo && assignedTo !== user.id) {
      await supabase.from("notifications").insert([
        {
          user_id: assignedTo,
          message: `Task "${title}" has been assigned to you`,
        },
      ]);
    }
  }

  await fetchTasks();
  resetForm();
  setFile(null);
};

  const deleteTask = async (id: number) => {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) {
      console.error("DELETE ERROR:", error.message);
      return;
    }
    fetchTasks();
  };

  const editTask = (task: Task) => {
    setTitle(task.title);
    setDescription(task.description);
    setDeadline(task.deadline);
    setStatus(task.status);
    setPriority(task.priority);
    setEditingId(task.id);
    setAssignedTo(task.assigned_to || "");
    setShowForm(true);
  };

  const getPriorityBadge = (priority: Priority) => {
    if (priority === "high") return "bg-red-100 text-red-600 border border-red-200";
    if (priority === "medium") return "bg-yellow-100 text-yellow-700 border border-yellow-200";
    return "bg-gray-100 text-gray-600 border border-gray-200";
  };

  const getStatusColor = (status: Status) => {
    if (status === "done") return "text-green-600";
    if (status === "in-progress") return "text-blue-600";
    return "text-gray-600";
  };

  const getDeadlineStatus = (date: string, status: Status) => {
    if (!date) return "";

    const today = new Date();
    const d = new Date(date);

    if (status !== "done" && d < today) return "Overdue";
    if (d.toDateString() === today.toDateString()) return "Due Today";
    return "Upcoming";
  };

  return (
    <>
      {/* TASK PANEL */}
      <div className="bg-white p-5 rounded-2xl shadow-sm mt-6 border border-gray-200 transition hover:shadow-lg max-h-[500px] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-[#0B3D2E] tracking-wide">
            Tasks
          </h2>

          {(role === "ceo" || role === "manager" || role === "employee" || role ==="backend_employee" || role === "hr") && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-black text-white px-4 py-2 rounded-lg hover:scale-105 hover:shadow-md transition-all duration-200"
            >
              + Add Task
            </button>
          )}
        </div>

        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scroll-smooth">
          {tasks.length === 0 && (
            <p className="text-sm text-gray-400">No tasks yet</p>
          )}

          {tasks.map((task) => (
            <div
              key={task.id}
              onClick={() => setSelectedTask(task)}
              className="border border-gray-200 p-4 rounded-xl cursor-pointer bg-white 
              hover:border-[#C6A15B] hover:shadow-md transition-all duration-200 transform hover:-translate-y-1"
            >
              <div className="flex justify-between items-center">
                <p className="font-semibold text-gray-800">{task.title}</p>
                <span
                  className={`px-2 py-1 text-xs rounded-full ${getPriorityBadge(
                    task.priority
                  )}`}
                >
                  {task.priority.toUpperCase()}
                </span>
              </div>

              <p className={`text-sm mt-1 ${getStatusColor(task.status)}`}>
                Status: {task.status}
              </p>

              <p className="text-xs text-gray-500 mt-1">
                Deadline: {task.deadline || "N/A"} (
                {getDeadlineStatus(task.deadline, task.status)})
              </p>

              {task.assigned_to && (
                <p className="text-xs text-gray-500 mt-1">
                  Assigned To: {task.assigned_user?.name || "Unassigned"}
                </p>
              )}
                <p className="text-xs text-gray-500 mt-1">
                  Assigned By: {task.created_by_user?.name || "Unknown"}
                </p>
            </div>
          ))}
        </div>
      </div>

      {/* ADD / EDIT MODAL */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
          onClick={resetForm}
        >
          <div className="absolute inset-0 bg-black/40"></div>

          <div
            className="relative bg-white p-6 rounded-2xl w-96 space-y-3 z-50 shadow-2xl animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-lg">
              {editingId ? "Edit Task" : "Add Task"}
            </h3>

            <input
              className="border p-2 w-full rounded-lg focus:ring-2 focus:ring-[#C6A15B] outline-none"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <textarea
              className="border p-2 w-full rounded-lg focus:ring-2 focus:ring-[#C6A15B] outline-none"
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <div>
              <label className="text-sm font-medium">Priority</label>
              <select
                className="border p-2 w-full mt-1 rounded-lg"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Status</label>
              <select
                className="border p-2 w-full mt-1 rounded-lg"
                value={status}
                onChange={(e) => setStatus(e.target.value as Status)}
              >
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Deadline</label>
              <input
                type="date"
                className="border p-2 w-full mt-1 rounded-lg"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>

            {(role === "ceo" || role === "manager" || role === "hr") && (
              <div>
                <label className="text-sm font-medium">Assign To</label>
                <select
                  className="border p-2 w-full mt-1 rounded-lg"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                >
                  <option value="">Select User</option>
                  {assignableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} 
                    </option>
                  ))}
                </select>
              </div>
            )}

            <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="border p-2 w-full rounded-lg"
          />

            <div className="flex justify-between">
              <button onClick={resetForm} className="text-gray-500">
                Cancel
              </button>

              <button
                onClick={handleSubmit}
                className="bg-black text-white px-4 py-1 rounded-lg hover:scale-105 transition"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
{selectedTask && (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
    onClick={() => setSelectedTask(null)}
  >
    <div className="absolute inset-0 bg-black/40"></div>

    {(() => {
      const task = selectedTask; // ✅ fixes TS null issue

      return (
        <div
          className="relative bg-white p-6 rounded-2xl w-96 space-y-4 z-50 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Title */}
          <h3 className="text-xl font-semibold text-gray-800">
            {task.title}
          </h3>

          {/* Description */}
          <p className="text-gray-600 text-sm">
            {task.description || "No description"}
          </p>

          <div className="border-t border-gray-200"></div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <p>
              <span className="font-medium text-gray-700">Priority:</span>{" "}
              <span className="text-gray-600 capitalize">{task.priority}</span>
            </p>

            <p>
              <span className="font-medium text-gray-700">Status:</span>{" "}
              <span className="text-gray-600 capitalize">{task.status}</span>
            </p>

            <p>
              <span className="font-medium text-gray-700">Deadline:</span>{" "}
              <span className="text-gray-600">
                {task.deadline || "N/A"}
              </span>
            </p>

            <p>
              <span className="font-medium text-gray-700">Assigned To:</span>{" "}
              <span className="text-gray-600">
                {task.assigned_user?.name || "Unassigned"}
              </span>
            </p>

            <p className="col-span-2">
              <span className="font-medium text-gray-700">Assigned By:</span>{" "}
              <span className="text-gray-600">
                {task.created_by_user?.name || "Unknown"}
              </span>
            </p>
          </div>

          {/* Attachment */}
          {task.attachment_url && (
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-1">
                📎 Attachment
              </p>
              <a
                href={task.attachment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 text-sm underline hover:text-blue-800"
              >
                View / Download File
              </a>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => setSelectedTask(null)}
              className="text-gray-500 hover:text-black text-sm"
            >
              Close
            </button>

            {(role === "ceo" || task.user_id === user?.id) && (
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setSelectedTask(null);
                    editTask(task);
                  }}
                  className="text-blue-600 text-sm hover:underline"
                >
                  Edit
                </button>

                <button
                  onClick={() => {
                    deleteTask(task.id);
                    setSelectedTask(null);
                  }}
                  className="text-red-600 text-sm hover:underline"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      );
    })()}
  </div>
)}
</>
);
};
export default Tasks;