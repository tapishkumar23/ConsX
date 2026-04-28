import { useState, useEffect } from "react";
import {
  Calendar,
  dateFnsLocalizer,
} from "react-big-calendar";

import type { SlotInfo, Event as RBCEvent } from "react-big-calendar";
import "../App.css";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { supabase } from "../Supabase/supabase";
import { useAuth } from "../pages/AuthContext";
import ICAL from "ical.js";

const locales = {
  "en-US": enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

type DBEvent = {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  type: "meeting" | "task" | "leave";
  user_id: string;
};

type EventType = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: "meeting" | "task" | "leave";
};

const CalendarView = () => {
  const [events, setEvents] = useState<EventType[]>([]);
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventType | null>(null);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week" | "day">("month");

  const [form, setForm] = useState({
    title: "",
    type: "meeting" as EventType["type"],
    start: "",
    end: "",
  });

  const fetchUSHolidays = async (year: number) => {
    try {
      const res = await fetch(
        `https://date.nager.at/api/v3/PublicHolidays/${year}/US`
      );
      const data = await res.json();

      const holidays: EventType[] = data.map((h: any) => ({
        id: `holiday-${h.date}`,
        title: `🇺🇸 ${h.localName}`,
        start: new Date(h.date),
        end: new Date(h.date),
        type: "leave",
      }));

      return holidays;
    } catch (err) {
      console.error("Holiday fetch error:", err);
      return [];
    }
  };

  const fetchIndianHolidays = async (year: number) => {
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
        type: "leave",
      };
    });
  } catch (err) {
    console.error("Holiday fetch error:", err);
    return [];
  }
};
  
  const getCountryByRole = (role: string) => {
  switch (role) {
    case "backend_employee":
      return "IN";

    case "ceo":
    case "manager":
    case "employee":
    default:
      return "US";
  }
};

  const fetchEvents = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("user_id", user.id);

    if (error || !data) {
      console.error(error);
      return;
    }

    const formatted: EventType[] = data.map((e: DBEvent) => ({
      id: e.id,
      title: e.title,
      start: new Date(e.start_time),
      end: new Date(e.end_time),
      type: e.type,
    }));

    // 👉 get user role
const { data: userData } = await supabase
  .from("users")
  .select("role")
  .eq("id", user.id)
  .single();

const role = userData?.role || "employee";

// 👉 map role → country
let holidays: EventType[] = [];

if (role === "backend_employee") {
  holidays = await fetchIndianHolidays(currentDate.getFullYear());
} else {
  holidays = await fetchUSHolidays(currentDate.getFullYear());

}
    setEvents([...formatted, ...holidays]);
    console.log("USER DATA:", userData);
    console.log("ROLE:", role); 
  };

  useEffect(() => {
    if (!user) return;
    fetchEvents();
  }, [user?.id, currentDate]);

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

    if (editingEvent) {
      await supabase
        .from("events")
        .update({
          title: form.title,
          start_time: startDate,
          end_time: endDate,
          type: form.type,
        })
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

    setShowModal(false);
    fetchEvents();
  };

  const handleDelete = async () => {
    if (!editingEvent) return;

    await supabase
      .from("events")
      .delete()
      .eq("id", editingEvent.id)
      .eq("user_id", user?.id);

    setShowModal(false);
    fetchEvents();
  };

  // 🎨 CLEAN EVENT COLORS (NEUTRAL SYSTEM)
  const eventStyleGetter = (event: EventType) => {
    let bg = "#111827"; // default (black-ish)
    let text = "#ffffff";

    if (event.type === "task") {
      bg = "#374151"; // dark grey
    }

    if (event.type === "leave") {
      bg = "#9ca3af"; // light grey
      text = "#111827";
    }

    return {
      style: {
        backgroundColor: bg,
        color: text,
        borderRadius: "6px",
        border: "none",
        padding: "4px 6px",
        fontSize: "11px",
        fontWeight: "500",
      },
    };
  };

  const CustomEvent = ({ event }: { event: EventType }) => {
    return (
      <div title={event.title} className="leading-tight">
        <div className="text-[11px] font-medium truncate">
          {event.title}
        </div>
      </div>
    );
  };

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

      {/* MODAL */}
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
              onChange={(e) =>
                setForm({ ...form, title: e.target.value })
              }
              className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-800"
            />

            <select
              value={form.type}
              onChange={(e) =>
                setForm({
                  ...form,
                  type: e.target.value as EventType["type"],
                })
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
              onChange={(e) =>
                setForm({ ...form, start: e.target.value })
              }
              className="w-full border border-gray-300 p-2 rounded-md"
            />

            <input
              type="datetime-local"
              value={form.end}
              onChange={(e) =>
                setForm({ ...form, end: e.target.value })
              }
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
                  onClick={() => setShowModal(false)}
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
    </div>
  );
};

export default CalendarView;