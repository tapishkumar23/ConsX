import { useEffect, useState } from "react";
import { supabase } from "../Supabase/supabase";

interface User {
  id: string;
  name: string;
}

const CreateAnnouncement = ({ user }: any) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("normal");
  const [targetType, setTargetType] = useState("all");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data } = await supabase
      .from("users")
      .select("id, name")
      .neq("role", "ceo");

    if (data) {
      setUsers(data);
    }
  };

  const handleCreate = async () => {
    if (!title || !description) return;

    setLoading(true);

const { data, error } = await supabase
  .from("announcements")
  .insert({
    title,
    description,
    created_by: user.id,
    target_type: targetType,
    target_users:
      targetType === "selected"
        ? selectedUsers
        : null,
    priority,
    banner_color:
      priority === "urgent"
        ? "#991B1B"
        : priority === "important"
        ? "#92400E"
        : "#0B3D2E",
  });

console.log("INSERT DATA:", data);
console.log("INSERT ERROR:", error);

if (error) {
  alert(error.message);
  setLoading(false);
  return;
}

    setTitle("");
    setDescription("");
    setSelectedUsers([]);
    setLoading(false);
    window.location.reload();
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
      <h2 className="text-xl font-semibold text-[#0B3D2E] mb-5">
        Broadcast Announcement
      </h2>

      <div className="space-y-4">
        <input
          type="text"
          placeholder="Announcement title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#C6A15B]"
        />

        <textarea
          placeholder="Write announcement..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          className="w-full border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#C6A15B]"
        />

        <div className="grid sm:grid-cols-2 gap-4">
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="border rounded-xl p-3"
          >
            <option value="normal">Normal</option>
            <option value="important">Important</option>
            <option value="urgent">Urgent</option>
          </select>

          <select
            value={targetType}
            onChange={(e) => setTargetType(e.target.value)}
            className="border rounded-xl p-3"
          >
            <option value="all">All Employees</option>
            <option value="selected">Selected Employees</option>
          </select>
        </div>

        {targetType === "selected" && (
          <div className="border rounded-2xl p-4 max-h-56 overflow-y-auto space-y-2">
            {users.map((u) => (
              <label
                key={u.id}
                className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg"
              >
                <input
                  type="checkbox"
                  checked={selectedUsers.includes(u.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedUsers((prev) => [...prev, u.id]);
                    } else {
                      setSelectedUsers((prev) =>
                        prev.filter((id) => id !== u.id)
                      );
                    }
                  }}
                />

                <span>{u.name}</span>
              </label>
            ))}
          </div>
        )}

        <button
          onClick={handleCreate}
          disabled={loading}
          className="w-full bg-[#0B3D2E] hover:bg-[#14532d] text-white py-3 rounded-xl font-medium transition"
        >
          {loading ? "Broadcasting..." : "Broadcast Announcement"}
        </button>
      </div>
    </div>
  );
};

export default CreateAnnouncement;