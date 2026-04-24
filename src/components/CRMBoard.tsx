import { useState } from "react";
import {
  DndContext,
  closestCenter,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";

type Status =
  | "new"
  | "contacted"
  | "interested"
  | "negotiation"
  | "closed"
  | "lost";

type Lead = {
  id: number;
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

const initialLeads: Lead[] = [
  { id: 1, name: "John Doe", company: "ABC Ltd", status: "new" },
  { id: 2, name: "Jane Smith", company: "XYZ Inc", status: "contacted" },
];

const CRMBoard = () => {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (!over) return;

    setLeads((prev) =>
      prev.map((lead) =>
        lead.id === active.id
          ? { ...lead, status: over.id as Status }
          : lead
      )
    );
  };

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-6 gap-4 mt-6">
        {columns.map((col) => (
          <Column key={col} id={col} leads={leads.filter(l => l.status === col)} />
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