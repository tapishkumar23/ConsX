import { useState, useEffect } from "react";
import { supabase } from "../Supabase/supabase";
import { useAuth } from "../pages/AuthContext";

type Meeting = {
  id: string;
  title: string;
  description: string | null;
  meeting_date: string;
  meeting_time: string;
  duration_minutes: number;
  organizer_id: string | null;
  attendees: string[];
  meeting_link: string | null;
  location: string | null;
  status: "upcoming" | "completed" | "cancelled";
  created_at: string;
  organizer_name?: string;
  attendee_names?: string[];
};

type UserOption = { id: string; name: string };

const UpcomingMeetings = () => {
  const { user, role } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("10:00");
  const [duration, setDuration] = useState(60);
  const [location, setLocation] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);

  const canSchedule = role === "ceo" || role === "manager" || role === "hr";

  const fetchUsers = async () => {
    const { data } = await supabase.from("users").select("id, name");
    if (data) setUsers(data);
  };

  const fetchMeetings = async () => {
    if (!user) return;

    const today = new Date().toISOString().split("T")[0];

    const { data: ownMeetings } = await supabase
      .from("upcoming_meetings")
      .select("*")
      .gte("meeting_date", today)
      .eq("status", "upcoming")
      .eq("organizer_id", user.id)
      .order("meeting_date", { ascending: true })
      .order("meeting_time", { ascending: true });

    const { data: attendeeMeetings } = await supabase
      .from("upcoming_meetings")
      .select("*")
      .gte("meeting_date", today)
      .eq("status", "upcoming")
      .contains("attendees", [user.id])
      .order("meeting_date", { ascending: true })
      .order("meeting_time", { ascending: true });

    const data = [
      ...(ownMeetings || []),
      ...(attendeeMeetings || []),
    ].filter((m, idx, arr) => arr.findIndex((x) => x.id === m.id) === idx)
     .sort((a, b) => a.meeting_date.localeCompare(b.meeting_date) || a.meeting_time.localeCompare(b.meeting_time));

    const { data: usersData } = await supabase.from("users").select("id, name");

    const formatted = (data || []).map((m) => {
      const organizer = usersData?.find((u) => u.id === m.organizer_id);
      const attendeeNames = (m.attendees || [])
        .map((id: string) => usersData?.find((u) => u.id === id)?.name)
        .filter(Boolean) as string[];

      return {
        ...m,
        organizer_name: organizer?.name ?? "Unknown",
        attendee_names: attendeeNames,
      };
    });

    setMeetings(formatted);
  };

  const [fetchTrigger, setFetchTrigger] = useState(0);

  useEffect(() => {
    fetchMeetings();
    fetchUsers();
  }, [user, fetchTrigger]);

  // Realtime subscription — auto-refresh when any meeting changes
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`meetings-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "upcoming_meetings" },
        () => setFetchTrigger((t) => t + 1)
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setMeetingDate("");
    setMeetingTime("10:00");
    setDuration(60);
    setLocation("");
    setMeetingLink("");
    setSelectedAttendees([]);
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async () => {
    if (!title || !meetingDate || !user) return;

    const payload = {
      title,
      description: description || null,
      meeting_date: meetingDate,
      meeting_time: meetingTime,
      duration_minutes: duration,
      organizer_id: user.id,
      attendees: selectedAttendees,
      location: location || null,
      meeting_link: meetingLink || null,
      status: "upcoming" as const,
    };

    if (editingId) {
      const { error } = await supabase
        .from("upcoming_meetings")
        .update(payload)
        .eq("id", editingId);

      if (error) {
        console.error("UPDATE ERROR:", error.message);
        return;
      }
    } else {
      const { error } = await supabase
        .from("upcoming_meetings")
        .insert([payload]);

      if (error) {
        console.error("INSERT ERROR:", error.message);
        return;
      }

      // Notify attendees
      for (const attendeeId of selectedAttendees) {
        if (attendeeId !== user.id) {
          const { data: organizer } = await supabase
            .from("users")
            .select("name")
            .eq("id", user.id)
            .single();

          await supabase.from("notifications").insert([
            {
              user_id: attendeeId,
              message: `${organizer?.name ?? "Someone"} scheduled a meeting "${title}" on ${meetingDate}`,
            },
          ]);
        }
      }
    }

    await fetchMeetings();
    resetForm();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("upcoming_meetings").delete().eq("id", id);
    setSelectedMeeting(null);
    fetchMeetings();
  };

  const handleEdit = (m: Meeting) => {
    setTitle(m.title);
    setDescription(m.description ?? "");
    setMeetingDate(m.meeting_date);
    setMeetingTime(m.meeting_time);
    setDuration(m.duration_minutes);
    setLocation(m.location ?? "");
    setMeetingLink(m.meeting_link ?? "");
    setSelectedAttendees(m.attendees ?? []);
    setEditingId(m.id);
    setSelectedMeeting(null);
    setShowForm(true);
  };

  const toggleAttendee = (id: string) => {
    setSelectedAttendees((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const formatTime = (time: string) => {
    const [h, m] = time.split(":");
    const d = new Date();
    d.setHours(Number(h));
    d.setMinutes(Number(m));
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  const formatDate = (date: string) => {
    return new Date(date + "T00:00:00").toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const isToday = (date: string) => {
    return date === new Date().toISOString().split("T")[0];
  };

  return (
    <>
      {/* HEADER */}
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-sm sm:text-base text-[#0B3D2E] font-semibold">
          Upcoming Meetings
        </h2>
        <div className="flex items-center gap-3">
          {canSchedule && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-black text-white text-xs px-3 py-1.5 rounded-lg hover:scale-105 hover:shadow-md transition-all duration-200"
            >
              + Schedule
            </button>
          )}
          <div className="w-2 h-2 rounded-full bg-[#C6A15B]"></div>
        </div>
      </div>

      <div className="h-[1px] bg-gradient-to-r from-[#C6A15B]/30 to-transparent mb-4"></div>

      {/* TABLE */}
      {meetings.length === 0 ? (
        <p className="text-sm text-gray-400">No upcoming meetings</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="pb-2 font-medium pr-4">Meeting</th>
                <th className="pb-2 font-medium pr-4">Date & Time</th>
                <th className="pb-2 font-medium pr-4">Duration</th>
                <th className="pb-2 font-medium pr-4">Location / Link</th>
                <th className="pb-2 font-medium pr-4">Organizer</th>
                <th className="pb-2 font-medium">Attendees</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {meetings.map((m) => (
                <tr
                  key={m.id}
                  onClick={() => setSelectedMeeting(m)}
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      {isToday(m.meeting_date) && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#C6A15B] flex-shrink-0"></span>
                      )}
                      <span className="font-medium text-gray-800 truncate max-w-[140px]">
                        {m.title}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 pr-4 whitespace-nowrap">
                    <span
                      className={`${
                        isToday(m.meeting_date)
                          ? "text-[#C6A15B] font-semibold"
                          : "text-gray-600"
                      }`}
                    >
                      {formatDate(m.meeting_date)}
                    </span>
                    <br />
                    <span className="text-gray-400 text-xs">
                      {formatTime(m.meeting_time)}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-gray-500">
                    {m.duration_minutes} min
                  </td>
                  <td className="py-3 pr-4">
                    {m.meeting_link ? (
                      <a
                        href={m.meeting_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-blue-600 hover:underline text-xs truncate max-w-[120px] block"
                      >
                        Join Link
                      </a>
                    ) : (
                      <span className="text-gray-500 text-xs truncate max-w-[120px] block">
                        {m.location || "—"}
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-gray-500">
                    {m.organizer_name}
                  </td>
                  <td className="py-3">
                    {m.attendee_names && m.attendee_names.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {m.attendee_names.slice(0, 2).map((name) => (
                          <span
                            key={name}
                            className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full"
                          >
                            {name}
                          </span>
                        ))}
                        {m.attendee_names.length > 2 && (
                          <span className="text-gray-400 text-xs">
                            +{m.attendee_names.length - 2} more
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* SCHEDULE MODAL */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
          onClick={resetForm}
        >
          <div className="absolute inset-0 bg-black/40"></div>
          <div
            className="relative bg-white p-6 rounded-2xl w-[420px] max-h-[90vh] overflow-y-auto space-y-3 z-50 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-lg">
              {editingId ? "Edit Meeting" : "Schedule Meeting"}
            </h3>

            <input
              className="border p-2 w-full rounded-lg focus:ring-2 focus:ring-[#C6A15B] outline-none"
              placeholder="Meeting title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <textarea
              className="border p-2 w-full rounded-lg focus:ring-2 focus:ring-[#C6A15B] outline-none resize-none"
              placeholder="Description (optional)"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">
                  Date
                </label>
                <input
                  type="date"
                  className="border p-2 w-full rounded-lg focus:ring-2 focus:ring-[#C6A15B] outline-none"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">
                  Time
                </label>
                <input
                  type="time"
                  className="border p-2 w-full rounded-lg focus:ring-2 focus:ring-[#C6A15B] outline-none"
                  value={meetingTime}
                  onChange={(e) => setMeetingTime(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">
                Duration (minutes)
              </label>
              <select
                className="border p-2 w-full rounded-lg"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              >
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
              </select>
            </div>

            <input
              className="border p-2 w-full rounded-lg focus:ring-2 focus:ring-[#C6A15B] outline-none"
              placeholder="Location (optional)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />

            <input
              className="border p-2 w-full rounded-lg focus:ring-2 focus:ring-[#C6A15B] outline-none"
              placeholder="Meeting link (optional)"
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
            />

            <div>
              <label className="text-xs font-medium text-gray-600 block mb-2">
                Attendees
              </label>
              <div className="border rounded-lg p-2 max-h-36 overflow-y-auto space-y-1">
                {users.map((u) => (
                  <label
                    key={u.id}
                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={selectedAttendees.includes(u.id)}
                      onChange={() => toggleAttendee(u.id)}
                      className="accent-[#0B3D2E]"
                    />
                    <span className="text-sm text-gray-700">{u.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-between pt-1">
              <button onClick={resetForm} className="text-gray-500 text-sm">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="bg-black text-white px-4 py-1.5 rounded-lg hover:scale-105 transition text-sm"
              >
                {editingId ? "Save Changes" : "Schedule"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedMeeting && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
          onClick={() => setSelectedMeeting(null)}
        >
          <div className="absolute inset-0 bg-black/40"></div>
          <div
            className="relative bg-white p-6 rounded-2xl w-[400px] space-y-4 z-50 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold text-gray-800">
              {selectedMeeting.title}
            </h3>

            {selectedMeeting.description && (
              <p className="text-gray-600 text-sm">{selectedMeeting.description}</p>
            )}

            <div className="border-t border-gray-100"></div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <p>
                <span className="font-medium text-gray-700">Date:</span>{" "}
                <span className="text-gray-600">
                  {formatDate(selectedMeeting.meeting_date)}
                </span>
              </p>
              <p>
                <span className="font-medium text-gray-700">Time:</span>{" "}
                <span className="text-gray-600">
                  {formatTime(selectedMeeting.meeting_time)}
                </span>
              </p>
              <p>
                <span className="font-medium text-gray-700">Duration:</span>{" "}
                <span className="text-gray-600">
                  {selectedMeeting.duration_minutes} min
                </span>
              </p>
              <p>
                <span className="font-medium text-gray-700">Organizer:</span>{" "}
                <span className="text-gray-600">{selectedMeeting.organizer_name}</span>
              </p>

              {selectedMeeting.location && (
                <p className="col-span-2">
                  <span className="font-medium text-gray-700">Location:</span>{" "}
                  <span className="text-gray-600">{selectedMeeting.location}</span>
                </p>
              )}

              {selectedMeeting.meeting_link && (
                <p className="col-span-2">
                  <span className="font-medium text-gray-700">Link:</span>{" "}
                  <a
                    href={selectedMeeting.meeting_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Join Meeting
                  </a>
                </p>
              )}

              {selectedMeeting.attendee_names &&
                selectedMeeting.attendee_names.length > 0 && (
                  <div className="col-span-2">
                    <span className="font-medium text-gray-700 block mb-1">
                      Attendees:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedMeeting.attendee_names.map((name) => (
                        <span
                          key={name}
                          className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() => setSelectedMeeting(null)}
                className="text-gray-500 text-sm hover:text-black"
              >
                Close
              </button>

              {(role === "ceo" ||
                selectedMeeting.organizer_id === user?.id) && (
                <div className="flex gap-3">
                  <button
                    onClick={() => handleEdit(selectedMeeting)}
                    className="text-blue-600 text-sm hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(selectedMeeting.id)}
                    className="text-red-600 text-sm hover:underline"
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

export default UpcomingMeetings;
