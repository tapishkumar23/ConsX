import { useState } from "react";

type LeadStatus =
  | "new"
  | "contacted"
  | "interested"
  | "negotiation"
  | "closed"
  | "lost";

type Priority = "low" | "medium" | "high";

type Lead = {
  id: number;
  leadId: string;
  name: string;
  company: string;
  email: string;
  phone: string;

  status: LeadStatus;
  priority: Priority;

  type: string;
  source: string;
  jobTitle: string;

  lastContacted: string;
  nextFollowUp: string;

  description: string;
};

const CRM = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<LeadStatus>("new");
  const [priority, setPriority] = useState<Priority>("medium");

  const [type, setType] = useState("");
  const [source, setSource] = useState("");
  const [jobTitle, setJobTitle] = useState("");

  const [lastContacted, setLastContacted] = useState("");
  const [nextFollowUp, setNextFollowUp] = useState("");

  const [description, setDescription] = useState("");

  const generateLeadId = () => {
    return "LEAD-" + Math.floor(10000 + Math.random() * 90000);
  };

  const handleSubmit = () => {
    if (!name) return;

    if (editingId) {
      setLeads(
        leads.map((l) =>
          l.id === editingId
            ? {
                ...l,
                name,
                company,
                email,
                phone,
                status,
                priority,
                type,
                source,
                jobTitle,
                lastContacted,
                nextFollowUp,
                description,
              }
            : l
        )
      );
      setEditingId(null);
    } else {
      const newLead: Lead = {
        id: Date.now(),
        leadId: generateLeadId(),
        name,
        company,
        email,
        phone,
        status,
        priority,
        type,
        source,
        jobTitle,
        lastContacted,
        nextFollowUp,
        description,
      };

      setLeads([...leads, newLead]);
    }

    resetForm();
  };

  const resetForm = () => {
    setName("");
    setCompany("");
    setEmail("");
    setPhone("");
    setStatus("new");
    setPriority("medium");
    setType("");
    setSource("");
    setJobTitle("");
    setLastContacted("");
    setNextFollowUp("");
    setDescription("");
    setShowForm(false);
    setEditingId(null);
  };

  const deleteLead = (id: number) => {
    setLeads(leads.filter((l) => l.id !== id));
  };

  const editLead = (lead: Lead) => {
    setName(lead.name);
    setCompany(lead.company);
    setEmail(lead.email);
    setPhone(lead.phone);
    setStatus(lead.status);
    setPriority(lead.priority);
    setType(lead.type);
    setSource(lead.source);
    setJobTitle(lead.jobTitle);
    setLastContacted(lead.lastContacted);
    setNextFollowUp(lead.nextFollowUp);
    setDescription(lead.description);
    setEditingId(lead.id);
    setShowForm(true);
  };

  const getPriorityColor = (priority: Priority) => {
    if (priority === "high") return "text-red-600";
    if (priority === "medium") return "text-yellow-600";
    return "text-gray-600";
  };

  const getFollowUpStatus = (date: string) => {
    if (!date) return "";
    const today = new Date();
    const followUp = new Date(date);

    if (followUp < today) return "Overdue";
    if (followUp.toDateString() === today.toDateString()) return "Due Today";
    return "Upcoming";
  };

  return (
    <>
      {/* MAIN CARD */}
      <div className="bg-white p-4 rounded-xl shadow mt-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">CRM Leads</h2>

          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-500 text-white px-3 py-1 rounded"
          >
            + Add Lead
          </button>
        </div>

        <div className="space-y-3">
          {leads.length === 0 && (
            <p className="text-sm text-gray-500">No leads yet</p>
          )}

          {leads.map((lead) => (
            <div
              key={lead.id}
              className="border p-3 rounded cursor-pointer hover:bg-gray-50"
              onClick={() => setSelectedLead(lead)}
            >
              <div className="flex justify-between">
                <p className="font-medium">{lead.name}</p>
                
              </div>

              <p className="text-sm text-gray-600">{lead.company}</p>

              <p className="text-xs">📞 {lead.phone}</p>
              <p className="text-xs">ID: {lead.leadId}</p>

              <p className="text-xs mt-1">
                Follow-up: {getFollowUpStatus(lead.nextFollowUp)}
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
            className="relative bg-white p-6 rounded w-96 space-y-2 z-50 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold">
              {editingId ? "Edit Lead" : "Add Lead"}
            </h3>

            <input className="border p-2 w-full" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <input className="border p-2 w-full" placeholder="Company" value={company} onChange={(e) => setCompany(e.target.value)} />
            <input className="border p-2 w-full" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input className="border p-2 w-full" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />

            <input className="border p-2 w-full" placeholder="Job Title" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
            <input className="border p-2 w-full" placeholder="Lead Source" value={source} onChange={(e) => setSource(e.target.value)} />
            <input className="border p-2 w-full" placeholder="Type of Lead" value={type} onChange={(e) => setType(e.target.value)} />

            <label className="text-sm font-medium">Priority</label>
            <select className="border p-2 w-full mt-1 rounded" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>

            <label className="text-sm font-medium">Last Contacted</label>
            <input type="date" className="border p-2 w-full mt-1 rounded" value={lastContacted} onChange={(e) => setLastContacted(e.target.value)} />

            <label className="text-sm font-medium">Next Follow-up</label>
            <input type="date" className="border p-2 w-full mt-1 rounded" value={nextFollowUp} onChange={(e) => setNextFollowUp(e.target.value)} />

            <textarea className="border p-2 w-full" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />

            <div className="flex justify-between">
              <button onClick={resetForm} className="text-gray-500">
                Cancel
              </button>
              <button onClick={handleSubmit} className="bg-blue-500 text-white px-3 py-1 rounded">
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedLead && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => setSelectedLead(null)}
        >
          <div className="absolute inset-0 bg-black bg-opacity-40"></div>

          <div
            className="relative bg-white p-6 rounded w-[400px] space-y-3 z-50 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold">{selectedLead.name}</h3>

            <p><strong>Company:</strong> {selectedLead.company}</p>
            <p><strong>Email:</strong> {selectedLead.email}</p>
            <p><strong>Phone:</strong> {selectedLead.phone}</p>
            <p><strong>ID:</strong> {selectedLead.leadId}</p>

            <p><strong>Status:</strong> {selectedLead.status}</p>
            <p><strong>Priority:</strong> {selectedLead.priority}</p>

            <p><strong>Job Title:</strong> {selectedLead.jobTitle}</p>
            <p><strong>Source:</strong> {selectedLead.source}</p>
            <p><strong>Type:</strong> {selectedLead.type}</p>

            <p><strong>Last Contacted:</strong> {selectedLead.lastContacted || "N/A"}</p>
            <p><strong>Next Follow-up:</strong> {selectedLead.nextFollowUp || "N/A"}</p>

            <p className="text-sm text-gray-600">{selectedLead.description}</p>

            <div className="flex justify-between mt-4">
              <button onClick={() => setSelectedLead(null)} className="text-gray-500">
                Close
              </button>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setSelectedLead(null);
                    editLead(selectedLead);
                  }}
                  className="text-blue-600"
                >
                  Edit
                </button>

                <button
                  onClick={() => {
                    deleteLead(selectedLead.id);
                    setSelectedLead(null);
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

export default CRM;