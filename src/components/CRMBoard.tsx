import { useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { supabase } from "../Supabase/supabase";

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

  // ✅ FETCH FROM SUPABASE
  const fetchLeads = async () => {
    const { data, error } = await supabase.from("leads").select("*");

    if (error || !data) {
      console.error(error);
      return;
    }

    const formatted = data.map((l: any) => ({
      id: l.id,
      name: l.name,
      company: l.company,
      status: l.status,
    }));

    setLeads(formatted);
  };

  useEffect(() => {
    fetchLeads();

    // ✅ REALTIME SUBSCRIPTION
    const channel = supabase
      .channel("realtime-leads")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads" },
        (payload) => {
          console.log("Realtime update:", payload);

          // simplest + reliable approach
          fetchLeads();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ✅ UPDATE STATUS IN DB ALSO
  const handleDragEnd = async (event: any) => {
    const { active, over } = event;

    if (!over) return;

    const newStatus = over.id as Status;

    // update UI instantly
    setLeads((prev) =>
      prev.map((lead) =>
        lead.id === active.id ? { ...lead, status: newStatus } : lead
      )
    );

    // update DB
    const { error } = await supabase
      .from("leads")
      .update({ status: newStatus })
      .eq("id", active.id);

    if (error) console.error("UPDATE ERROR:", error);
  };

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-6 gap-4 mt-6">
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
    <div ref={setNodeRef} className="bg-gray-100 p-3 rounded min-h-[300px]">
      <h3 className="font-semibold capitalize mb-2">{id}</h3>

      <div className="space-y-2">
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
      className="bg-white p-2 rounded shadow cursor-grab"
    >
      <p className="font-medium">{lead.name}</p>
      <p className="text-xs text-gray-500">{lead.company}</p>
    </div>
  );
};