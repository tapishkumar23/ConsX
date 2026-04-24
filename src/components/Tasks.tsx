import { useState, useEffect } from "react";
import { supabase } from "../Supabase/supabase";

type Status = "todo" | "in-progress" | "done";
type Priority = "low" | "medium" | "high";

type Task = {
  id: number;
  title: string;
  description: string;
  deadline: string;
  status: Status;
  priority: Priority;
};

const Tasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [status, setStatus] = useState<Status>("todo");
  const [priority, setPriority] = useState<Priority>("medium");

  // ✅ FETCH TASKS (FIXED)
  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      console.error("FETCH ERROR:", error.message);
      return;
    }

    // ✅ Fix date format crash
    const formatted = (data || []).map((t) => ({
      ...t,
      deadline: t.deadline ? String(t.deadline) : "",
    }));

    setTasks(formatted);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDeadline("");
    setStatus("todo");
    setPriority("medium");
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async () => {
    if (!title) return;

    if (editingId) {
      // ✅ UPDATE
      const { error } = await supabase
        .from("tasks")
        .update({
          title,
          description,
          deadline: deadline || null,
          status,
          priority,
        })
        .eq("id", editingId);

      if (error) {
        console.error("UPDATE ERROR:", error.message);
        return;
      }
    } else {
      // ✅ INSERT (FIXED)
      const { error } = await supabase.from("tasks").insert([
        {
          title,
          description,
          deadline: deadline || null,
          status,
          priority,
        },
      ]);

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
    setShowForm(true);
  };

  const getPriorityBadge = (priority: Priority) => {
    if (priority === "high") return "bg-red-100 text-red-600";
    if (priority === "medium") return "bg-yellow-100 text-yellow-600";
    return "bg-gray-100 text-gray-600";
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
      <div className="bg-white p-4 rounded-xl shadow mt-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Tasks</h2>

          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-500 text-white px-3 py-1 rounded"
          >
            + Add Task
          </button>
        </div>

        <div className="space-y-3">
          {tasks.length === 0 && (
            <p className="text-sm text-gray-500">No tasks yet</p>
          )}

          {tasks.map((task) => (
            <div
              key={task.id}
              onClick={() => setSelectedTask(task)}
              className="border p-3 rounded cursor-pointer hover:bg-gray-50"
            >
              <div className="flex justify-between items-center">
                <p className="font-medium">{task.title}</p>

                <span
                  className={`px-2 py-1 text-xs rounded ${getPriorityBadge(
                    task.priority
                  )}`}
                >
                  {task.priority.toUpperCase()}
                </span>
              </div>

              <p className={`text-sm mt-1 ${getStatusColor(task.status)}`}>
                Status: {task.status}
              </p>

              <p className="text-xs text-gray-600">
                Deadline: {task.deadline || "N/A"} (
                {getDeadlineStatus(task.deadline, task.status)})
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ADD / EDIT MODAL */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={resetForm}
        >
          <div className="absolute inset-0 bg-black bg-opacity-40"></div>

          <div
            className="relative bg-white p-6 rounded w-96 space-y-3 z-50"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold">
              {editingId ? "Edit Task" : "Add Task"}
            </h3>

            <input
              className="border p-2 w-full"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <textarea
              className="border p-2 w-full"
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <div>
              <label className="text-sm font-medium">Priority</label>
              <select
                className="border p-2 w-full mt-1"
                value={priority}
                onChange={(e) =>
                  setPriority(e.target.value as Priority)
                }
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Status</label>
              <select
                className="border p-2 w-full mt-1"
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as Status)
                }
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
                className="border p-2 w-full mt-1"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>

            <div className="flex justify-between">
              <button
                onClick={resetForm}
                className="text-gray-500"
              >
                Cancel
              </button>

              <button
                onClick={handleSubmit}
                className="bg-blue-500 text-white px-3 py-1 rounded"
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
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => setSelectedTask(null)}
        >
          <div className="absolute inset-0 bg-black bg-opacity-40"></div>

          <div
            className="relative bg-white p-6 rounded w-96 space-y-3 z-50"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold">
              {selectedTask.title}
            </h3>

            <p>{selectedTask.description || "No description"}</p>

            <p><strong>Priority:</strong> {selectedTask.priority}</p>
            <p><strong>Status:</strong> {selectedTask.status}</p>
            <p><strong>Deadline:</strong> {selectedTask.deadline || "N/A"}</p>

            <div className="flex justify-between mt-4">
              <button
                onClick={() => setSelectedTask(null)}
                className="text-gray-500"
              >
                Close
              </button>

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
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Tasks;