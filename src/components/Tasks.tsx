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
};

const Tasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const { user, role } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [status, setStatus] = useState<Status>("todo");
  const [priority, setPriority] = useState<Priority>("medium");

  const [assignedTo, setAssignedTo] = useState<string>(""); // ✅ new
  const [assignableUsers, setAssignableUsers] = useState<{ id: string; email: string }[]>([]); // ✅ new

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

  let filteredUsers = [];

  if (role === "ceo") {
    filteredUsers = data.filter(
      (u) => u.role === "manager" || u.id === user.id
    );
  } else if (role === "manager") {
    filteredUsers = data.filter(
      (u) => u.role === "employee" || u.id === user.id
    );
  } else {
    // employee → only themselves
    filteredUsers = data.filter((u) => u.id === user.id);
  }

  setAssignableUsers(filteredUsers);
};

  /* ✅ Fetch tasks based on role */
  const fetchTasks = async () => {
    if (!user || !role) return;

    let query = supabase.from("tasks").select("*, assigned_user:users!tasks_assigned_to_fkey(name)").order("id", { ascending: false });

    if (role === "ceo") {
      // ceo can see all tasks
    } else if (role === "manager") {
      // manager sees tasks created by her or assigned to her
      query = query.or(`user_id.eq.${user.id},assigned_to.eq.${user.id}`);
    } else if (role === "employee") {
      // employee sees tasks assigned to him
      query = query.eq("assigned_to", user.id);
    } else {
      query = query.eq("user_id", user.id);
    }

    const { data, error } = await query;
    if (error) {
      console.error("FETCH ERROR:", error.message);
      return;
    }

    const formatted = (data || []).map((t) => ({
      ...t,
      deadline: t.deadline ? String(t.deadline) : "",
    }));

    setTasks(formatted);
  };

  useEffect(() => {
    fetchTasks();
    fetchAssignableUsers(); // load assignable users for form
  }, [role]);

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

  const handleSubmit = async () => {
    if (!title || !user) return;

    if (editingId) {
      const { error } = await supabase
        .from("tasks")
        .update({
          title,
          description,
          deadline: deadline || null,
          status,
          priority,
          assigned_to: assignedTo || null, // ✅ updated
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
          assigned_to: assignedTo || null, // ✅ new
        },
      ]);

      if (assignedTo && assignedTo !== user.id) {
        await supabase.from("notifications").insert([
          {
            user_id: assignedTo,
            message: `Task "${title}" has been assigned to you`,
          },
        ]);
      }

      if (error) {
        console.error("INSERT ERROR:", error.message);
        return;
      }
    }

    await fetchTasks();
    resetForm();
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
      <div className="bg-white p-5 rounded-2xl shadow-sm mt-6 border border-gray-200 transition hover:shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-[#0B3D2E] tracking-wide">
            Tasks
          </h2>

          {(role === "ceo" || role === "manager" || role === "employee") && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-black text-white px-4 py-2 rounded-lg hover:scale-105 hover:shadow-md transition-all duration-200"
            >
              + Add Task
            </button>
          )}
        </div>

        <div className="space-y-4">
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

            {(role === "ceo" || role === "manager") && (
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
                      {u.email}
                    </option>
                  ))}
                </select>
              </div>
            )}

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

          <div
            className="relative bg-white p-6 rounded-2xl w-96 space-y-3 z-50 shadow-2xl animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold">{selectedTask.title}</h3>

            <p className="text-gray-600">
              {selectedTask.description || "No description"}
            </p>

            <p><strong>Priority:</strong> {selectedTask.priority}</p>
            <p><strong>Status:</strong> {selectedTask.status}</p>
            <p><strong>Deadline:</strong> {selectedTask.deadline || "N/A"}</p>
            {selectedTask.assigned_to && (
              <p><strong>Assigned To:</strong> {selectedTask.assigned_to}</p>
            )}

            <div className="flex justify-between mt-4">
              <button onClick={() => setSelectedTask(null)}>Close</button>

              {(role === "ceo" ||
                (role === "manager" && selectedTask.user_id === user?.id)) && (
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setSelectedTask(null);
                      editTask(selectedTask);
                    }}
                    className="text-blue-600"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => {
                      deleteTask(selectedTask.id);
                      setSelectedTask(null);
                    }}
                    className="text-red-600"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Tasks;