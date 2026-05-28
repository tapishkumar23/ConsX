import { useState, useEffect } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import type { SlotInfo, Event as RBCEvent } from "react-big-calendar";
import "../App.css";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { supabase } from "../Supabase/supabase";
import { useAuth } from "../pages/AuthContext";

const locales = { "en-US": enUS };

const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

type DBEvent = {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  type: "meeting" | "task" | "leave";
  user_id: string;
};

type EventSource = "events" | "upcoming_meetings" | "tasks" | "holiday";

type EventType = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: "meeting" | "task" | "leave";
  source: EventSource;
};

const CalendarView = () => {
  const [events, setEvents] = useState<EventType[]>([]);
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoEvent, setInfoEvent] = useState<EventType | null>(null);
  const [editingEvent, setEditingEvent] = useState<EventType | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week" | "day">("month");
  const [fetchTrigger, setFetchTrigger] = useState(0);

  const [form, setForm] = useState({
    title: "",
    type: "meeting" as EventType["type"],
    start: "",
    end: "",
  });

  const fetchUSHolidays = async (year: number): Promise<EventType[]> => {
    try {
      const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/US`);
      const data = await res.json();
      return data.map((h: any) => ({
        id: `holiday-${h.date}`,
        title: `🇺🇸 ${h.localName}`,
        start: new Date(h.date),
        end: new Date(h.date),
        type: "leave" as const,
        source: "holiday" as const,
      }));
    } catch {
      return [];
    }
  };

  const fetchIndianHolidays = async (year: number): Promise<EventType[]> => {
    try {
      const res = await fetch(
        `https://calendarific.com/api/v2/holidays?api_key=tzLheE74hKHLTjUY7jjCQzNgu7R58jKc&country=IN&year=${year}`
      );
      const json = await res.json();
      return json.response.holidays.map((h: any) => {
        const date = new Date(h.date.iso);
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);
        return {
          id: `holiday-${h.date.iso}`,
          title: `🇮🇳 ${h.name}`,
          start,
          end,
          type: "leave" as const,
          source: "holiday" as const,
        };
      });
    } catch {
      return [];
    }
  };

  const getCountryByRole = (role: string) =>
    role === "backend_employee" ? "IN" : "US";

  const fetchEvents = async () => {
    if (!user) return;

    // 1. Manual calendar events (leave, task, legacy meeting entries)
    const { data: eventsData } = await supabase
      .from("events")
      .select("*")
      .eq("user_id", user.id);

    const formattedEvents: EventType[] = (eventsData || []).map((e: DBEvent) => ({
      id: e.id,
      title: e.title,
      start: new Date(e.start_time),
      end: new Date(e.end_time),
      type: e.type,
      source: "events" as const,
    }));

    // 2. Meetings from upcoming_meetings (organizer + attendee)
    const { data: ownMeetings } = await supabase
      .from("upcoming_meetings")
      .select("*")
      .eq("status", "upcoming")
      .eq("organizer_id", user.id);

    const { data: attendeeMeetings } = await supabase
      .from("upcoming_meetings")
      .select("*")
      .eq("status", "upcoming")
      .contains("attendees", [user.id]);

    const allMeetings = [
      ...(ownMeetings || []),
      ...(attendeeMeetings || []),
    ].filter((m, idx, arr) => arr.findIndex((x) => x.id === m.id) === idx);

    const formattedMeetings: EventType[] = allMeetings.map((m: any) => {
      const [yr, mo, da] = m.meeting_date.split("-").map(Number);
      const [hr, min] = m.meeting_time.split(":").map(Number);
      const start = new Date(yr, mo - 1, da, hr, min);
      const end = new Date(start.getTime() + (m.duration_minutes || 60) * 60000);
      return {
        id: m.id,
        title: m.title,
        start,
        end,
        type: "meeting" as const,
        source: "upcoming_meetings" as const,
      };
    });

    // 3. Tasks with deadlines — show on deadline day
    const { data: ownTasks } = await supabase
      .from("tasks")
      .select("*")
      .not("deadline", "is", null)
      .eq("user_id", user.id);

    const { data: assignedTasks } = await supabase
      .from("tasks")
      .select("*")
      .not("deadline", "is", null)
      .eq("assigned_to", user.id);

    const allTasks = [
      ...(ownTasks || []),
      ...(assignedTasks || []),
    ].filter((t, idx, arr) => arr.findIndex((x) => x.id === t.id) === idx);

    const formattedTasks: EventType[] = allTasks
      .filter((t: any) => !!t.deadline)
      .map((t: any) => {
        const [yr, mo, da] = t.deadline.split("-").map(Number);
        const [hr, min] = (t.deadline_time || "09:00").split(":").map(Number);
        const start = new Date(yr, mo - 1, da, hr, min);
        const end = new Date(start.getTime() + 60 * 60000);
        return {
          id: `task-${t.id}`,
          title: t.title,
          start,
          end,
          type: "task" as const,
          source: "tasks" as const,
        };
      });

    // 4. Holidays
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    const role = userData?.role || "employee";
    const holidays =
      getCountryByRole(role) === "IN"
        ? await fetchIndianHolidays(currentDate.getFullYear())
        : await fetchUSHolidays(currentDate.getFullYear());

    setEvents([...formattedEvents, ...formattedMeetings, ...formattedTasks, ...holidays]);
  };

  // Fetch on mount, date change, or realtime trigger
  useEffect(() => {
    if (!user) return;
    fetchEvents();
  }, [user?.id, currentDate, fetchTrigger]);

  // Realtime subscriptions — ping fetchTrigger on any change
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`calendar-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () =>
        setFetchTrigger((t) => t + 1)
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "upcoming_meetings" }, () =>
        setFetchTrigger((t) => t + 1)
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () =>
        setFetchTrigger((t) => t + 1)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const handleSelectSlot = (slotInfo: SlotInfo) => {
    setEditingEvent(null);
    setForm({
      title: "",
      type: "meeting",
      start: format(slotInfo.start, "yyyy-MM-dd'T'HH:mm"),
      end: format(slotInfo.end, "yyyy-MM-dd'T'HH:mm"),
    });
    setShowModal(true);
  };

  const handleSelectEvent = (event: RBCEvent) => {
    const e = event as EventType;
    // Tasks and holidays are read-only — show info popup only
    if (e.source === "tasks" || e.source === "holiday") {
      setInfoEvent(e);
      setShowInfoModal(true);
      return;
    }
    setEditingEvent(e);
    setForm({
      title: e.title,
      type: e.type,
      start: format(e.start, "yyyy-MM-dd'T'HH:mm"),
      end: format(e.end, "yyyy-MM-dd'T'HH:mm"),
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.start || !form.end) return;

    const startDate = new Date(form.start);
    const endDate = new Date(form.end);

    if (form.type === "meeting") {
      const meetingDate = format(startDate, "yyyy-MM-dd");
      const meetingTime = format(startDate, "HH:mm");
      const durationMinutes = Math.max(
        15,
        Math.round((endDate.getTime() - startDate.getTime()) / 60000)
      );

      if (editingEvent?.source === "upcoming_meetings") {
        await supabase
          .from("upcoming_meetings")
          .update({
            title: form.title,
            meeting_date: meetingDate,
            meeting_time: meetingTime,
            duration_minutes: durationMinutes,
          })
          .eq("id", editingEvent.id);
      } else if (editingEvent?.source === "events") {
        // Legacy meeting event in events table
        await supabase
          .from("events")
          .update({ title: form.title, start_time: startDate, end_time: endDate, type: form.type })
          .eq("id", editingEvent.id);
      } else {
        // New meeting → write to upcoming_meetings so it syncs with the Meetings section
        await supabase.from("upcoming_meetings").insert([
          {
            title: form.title,
            meeting_date: meetingDate,
            meeting_time: meetingTime,
            duration_minutes: durationMinutes,
            organizer_id: user!.id,
            attendees: [],
            status: "upcoming",
          },
        ]);
      }
    } else {
      if (editingEvent?.source === "events") {
        await supabase
          .from("events")
          .update({ title: form.title, start_time: startDate, end_time: endDate, type: form.type })
          .eq("id", editingEvent.id);
      } else {
        await supabase.from("events").insert([
          {
            title: form.title,
            start_time: startDate,
            end_time: endDate,
            type: form.type,
            user_id: user!.id,
          },
        ]);
      }
    }

    setShowModal(false);
    setEditingEvent(null);
    // Realtime subscription will trigger re-fetch automatically
  };

  const handleDelete = async () => {
    if (!editingEvent) return;

    if (editingEvent.source === "upcoming_meetings") {
      await supabase.from("upcoming_meetings").delete().eq("id", editingEvent.id);
    } else {
      await supabase
        .from("events")
        .delete()
        .eq("id", editingEvent.id)
        .eq("user_id", user?.id);
    }

    setShowModal(false);
    setEditingEvent(null);
  };

  const eventStyleGetter = (event: EventType) => {
    let bg = "#111827";
    let text = "#ffffff";
    let border = "none";

    if (event.type === "meeting") {
      bg = "#FEE2E2";   // light red
      text = "#991B1B";
      border = "1px solid #FECACA";
    } else if (event.type === "task") {
      bg = "#DCFCE7";   // light green
      text = "#166534";
      border = "1px solid #BBF7D0";
    } else if (event.type === "leave") {
      bg = "#F3F4F6";   // light grey
      text = "#374151";
      border = "1px solid #E5E7EB";
    }

    return {
      style: {
        backgroundColor: bg,
        color: text,
        borderRadius: "6px",
        border,
        padding: "4px 6px",
        fontSize: "11px",
        fontWeight: "500",
      },
    };
  };

  const CustomEvent = ({ event }: { event: EventType }) => (
    <div title={event.title} className="leading-tight">
      <div className="text-[11px] font-medium truncate">{event.title}</div>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 h-[580px] max-w-5xl mx-auto">
      <Calendar
        localizer={localizer}
        events={events}
        selectable
        onSelectSlot={handleSelectSlot}
        onSelectEvent={handleSelectEvent}
        startAccessor="start"
        endAccessor="end"
        eventPropGetter={eventStyleGetter}
        components={{ event: CustomEvent }}
        date={currentDate}
        onNavigate={(date) => setCurrentDate(date)}
        view={view}
        onView={(v) => setView(v as any)}
        views={["month", "week", "day"]}
        toolbar={true}
        style={{ height: "100%" }}
      />

      {/* ADD / EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-[380px] space-y-4 shadow-lg border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              {editingEvent ? "Edit Event" : "Add Event"}
            </h2>

            <input
              type="text"
              placeholder="Event title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-800"
            />

            <select
              value={form.type}
              onChange={(e) =>
                setForm({ ...form, type: e.target.value as EventType["type"] })
              }
              className="w-full border border-gray-300 p-2 rounded-md"
            >
              <option value="meeting">Meeting</option>
              <option value="task">Task</option>
              <option value="leave">Leave</option>
            </select>

            <input
              type="datetime-local"
              value={form.start}
              onChange={(e) => setForm({ ...form, start: e.target.value })}
              className="w-full border border-gray-300 p-2 rounded-md"
            />

            <input
              type="datetime-local"
              value={form.end}
              onChange={(e) => setForm({ ...form, end: e.target.value })}
              className="w-full border border-gray-300 p-2 rounded-md"
            />

            <div className="flex justify-between">
              {editingEvent && (
                <button
                  onClick={handleDelete}
                  className="bg-gray-800 text-white px-3 py-1 rounded-md hover:bg-black"
                >
                  Delete
                </button>
              )}
              <div className="flex gap-2 ml-auto">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditingEvent(null);
                  }}
                  className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="bg-black text-white px-3 py-1 rounded-md hover:bg-gray-800"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INFO MODAL — tasks and holidays are read-only */}
      {showInfoModal && infoEvent && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setShowInfoModal(false)}
        >
          <div
            className="bg-white p-6 rounded-xl w-[320px] space-y-3 shadow-lg border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-gray-900">{infoEvent.title}</h2>
            <p className="text-sm text-gray-600">
              {format(infoEvent.start, "MMM d, yyyy")}
              {infoEvent.source === "tasks" && ` · ${format(infoEvent.start, "h:mm a")}`}
            </p>
            <p className="text-xs text-gray-400">
              {infoEvent.source === "tasks" ? "Task deadline" : "Holiday"}
            </p>
            <button
              onClick={() => setShowInfoModal(false)}
              className="text-gray-500 text-sm hover:text-black"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
