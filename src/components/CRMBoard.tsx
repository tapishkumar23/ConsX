import { useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { supabase } from "../Supabase/supabase";
import { useAuth } from "../pages/AuthContext";

type Status =
  | "new"
  | "contacted"
  | "interested"
  | "negotiation"
  | "closed"
  | "lost";

type Lead = {
  id: string;
  name: string;
  company: string;
  status: Status;
};

const columns: Status[] = [
  "new",
  "contacted",
  "interested",
  "negotiation",
  "closed",
  "lost",
];

const CRMBoard = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const { user, role } = useAuth();

const fetchLeads = async () => {
  if (!user) return;

  const { data, error } = await supabase
    .from("leads")
    .select("*");

  if (error || !data) {
    console.error(error);
    return;
  }

  const formatted = data.map((l: any) => ({
    id: l.id,
    name: l.name,
    company: l.company,
    status: (l.status || "new").toLowerCase(), // 🔥 important
  }));

  setLeads(formatted);
};

useEffect(() => {
  if (!user || !role) return;

  fetchLeads();

  const channel = supabase.channel("realtime-leads");

  channel.on(
    "postgres_changes",
    { event: "*", schema: "public", table: "leads" },
    () => {
      fetchLeads();
    }
  );

  channel.subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [user?.id, role]);


  const handleDragEnd = async (event: any) => {
    const { active, over } = event;

    if (!over) return;

    const newStatus = over.id as Status;

    setLeads((prev) =>
      prev.map((lead) =>
        lead.id === active.id ? { ...lead, status: newStatus } : lead
      )
    );

    const { error } = await supabase
      .from("leads")
      .update({ status: newStatus })
      .eq("id", active.id);

    if (error) console.error("UPDATE ERROR:", error);
  };

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-5 mt-6">
        {columns.map((col) => (
          <Column
            key={col}
            id={col}
            leads={leads.filter((l) => l.status === col)}
          />
        ))}
      </div>
    </DndContext>
  );
};

export default CRMBoard;

const Column = ({ id, leads }: { id: string; leads: Lead[] }) => {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className="bg-white border border-gray-200 rounded-2xl p-4 min-h-[320px] shadow-sm hover:shadow-md transition"
    >
      <h3 className="font-semibold capitalize mb-4 text-[#0B3D2E]">
        {id}
      </h3>

      <div className="space-y-3">
        {leads.map((lead) => (
          <Card key={lead.id} lead={lead} />
        ))}
      </div>
    </div>
  );
};

const Card = ({ lead }: { lead: Lead }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: lead.id,
  });

  const style = {
    transform: transform
      ? `translate(${transform.x}px, ${transform.y}px)`
      : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      className="bg-white border border-gray-200 p-3 rounded-xl shadow-sm cursor-grab 
      hover:shadow-md hover:bg-gray-50 transition-all duration-200 active:cursor-grabbing"
    >
      <p className="font-semibold text-[#0B3D2E] text-sm">
        {lead.name}
      </p>

      <p className="text-xs text-gray-500 mt-1">
        {lead.company}
      </p>
    </div>
  );
};