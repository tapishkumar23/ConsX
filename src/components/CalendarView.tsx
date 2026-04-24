import { useState, useEffect } from "react";
import {
  Calendar,
  dateFnsLocalizer,
} from "react-big-calendar";

import type { SlotInfo, Event as RBCEvent } from "react-big-calendar";

import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { supabase } from "../Supabase/supabase";

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

  // FETCH EVENTS
  const fetchEvents = async () => {
    const { data, error } = await supabase.from("events").select("*");

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

    setEvents(formatted);
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // SLOT SELECT
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

  // EVENT SELECT
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

  // SAVE
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
        },
      ]);
    }

    setShowModal(false);
    fetchEvents();
  };

  // DELETE
  const handleDelete = async () => {
    if (!editingEvent) return;

    await supabase
      .from("events")
      .delete()
      .eq("id", editingEvent.id);

    setShowModal(false);
    fetchEvents();
  };

  // 🎨 EVENT STYLE
  const eventStyleGetter = (event: EventType) => {
    let bg = "#3b82f6";

    if (event.type === "leave") bg = "#ef4444";
    if (event.type === "task") bg = "#10b981";

    return {
      style: {
        backgroundColor: bg,
        borderRadius: "6px",
        color: "white",
        border: "none",
        padding: "3px 5px",
        fontSize: "11px",
        fontWeight: "500",
      },
    };
  };

  // ✅ CUSTOM EVENT (better readability)
  const CustomEvent = ({ event }: { event: EventType }) => {
    return (
      <div title={event.title} className="leading-tight">
        <div className="text-[11px] font-semibold truncate">
          {event.title}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl p-2 shadow h-[580px] max-w-5xl mx-auto">
      
      
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
          <div className="bg-white p-6 rounded-xl w-[380px] space-y-4 shadow-xl">

            <h2 className="text-lg font-bold">
              {editingEvent ? "Edit Event" : "Add Event"}
            </h2>

            <input
              type="text"
              placeholder="Event title"
              value={form.title}
              onChange={(e) =>
                setForm({ ...form, title: e.target.value })
              }
              className="w-full border p-2 rounded"
            />

            <select
              value={form.type}
              onChange={(e) =>
                setForm({
                  ...form,
                  type: e.target.value as EventType["type"],
                })
              }
              className="w-full border p-2 rounded"
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
              className="w-full border p-2 rounded"
            />

            <input
              type="datetime-local"
              value={form.end}
              onChange={(e) =>
                setForm({ ...form, end: e.target.value })
              }
              className="w-full border p-2 rounded"
            />

            <div className="flex justify-between">
              {editingEvent && (
                <button
                  onClick={handleDelete}
                  className="bg-red-500 text-white px-3 py-1 rounded"
                >
                  Delete
                </button>
              )}

              <div className="flex gap-2 ml-auto">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1 border rounded"
                >
                  Cancel
                </button>

                <button
                  onClick={handleSave}
                  className="bg-blue-500 text-white px-3 py-1 rounded"
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