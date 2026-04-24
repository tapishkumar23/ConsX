import { useState } from "react";

type Task = {
  id: number;
  title: string;
  description: string;
  deadline: string;
  completed: boolean;
};

const Tasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");

  // Add or Update
  const handleSubmit = () => {
    if (!title) return;

    if (editingId) {
      setTasks(tasks.map(t =>
        t.id === editingId
          ? { ...t, title, description, deadline }
          : t
      ));
      setEditingId(null);
    } else {
      const newTask: Task = {
        id: Date.now(),
        title,
        description,
        deadline,
        completed: false,
      };
      setTasks([...tasks, newTask]);
    }

    setTitle("");
    setDescription("");
    setDeadline("");
    setShowForm(false);
  };

  const deleteTask = (id: number) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const toggleComplete = (id: number) => {
    setTasks(tasks.map(t =>
      t.id === id ? { ...t, completed: !t.completed } : t
    ));
  };

  const editTask = (task: Task) => {
    setTitle(task.title);
    setDescription(task.description);
    setDeadline(task.deadline);
    setEditingId(task.id);
    setShowForm(true);
  };

  const getStatus = (task: Task) => {
    if (task.completed) return "completed";
    if (task.deadline && new Date(task.deadline) < new Date()) return "overdue";
    return "pending";
  };

  const getStatusColor = (status: string) => {
    if (status === "completed") return "text-green-600";
    if (status === "overdue") return "text-red-600";
    return "text-yellow-600";
  };

  return (
    <>
      {/* MAIN TASK CARD */}
      <div className="bg-white p-4 rounded-xl shadow mt-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Tasks</h2>

          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 bg-blue-500 text-white px-3 py-1 rounded"
          >
            + Add Task
          </button>
        </div>

        {/* Task List */}
        <div className="space-y-3">
          {tasks.length === 0 && (
            <p className="text-sm text-gray-500">No tasks yet</p>
          )}

          {tasks.map(task => {
            const status = getStatus(task);

            return (
              <div key={task.id} className="border p-3 rounded">
                <p className="font-medium">{task.title}</p>
                <p className="text-sm text-gray-600">{task.description}</p>

                <p className="text-xs">
                  Deadline: {task.deadline || "None"}
                </p>

                <p className={`text-xs font-semibold ${getStatusColor(status)}`}>
                  {status.toUpperCase()}
                </p>

                <div className="flex gap-3 mt-2 text-sm">
                  <button
                    onClick={() => toggleComplete(task.id)}
                    className="text-green-600"
                  >
                    {task.completed ? "Undo" : "Complete"}
                  </button>

                  <button
                    onClick={() => editTask(task)}
                    className="text-blue-600"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => deleteTask(task.id)}
                    className="text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => {
            setShowForm(false);
            setEditingId(null);
          }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black bg-opacity-40"></div>

          {/* Modal Box */}
          <div
            className="relative bg-white p-6 rounded w-80 space-y-3 z-50"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold">
              {editingId ? "Edit Task" : "Add Task"}
            </h3>

            <input
              className="border p-2 w-full rounded"
              placeholder="Title"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />

            <input
              className="border p-2 w-full rounded"
              placeholder="Description"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />

            <input
              type="date"
              className="border p-2 w-full rounded"
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
            />

            <div className="flex justify-between">
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
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
    </>
  );
};

export default Tasks;