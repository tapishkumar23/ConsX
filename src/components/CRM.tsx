import { useState, useEffect } from "react";
import { supabase } from "../Supabase/supabase";

type LeadStatus =
  | "new"
  | "contacted"
  | "interested"
  | "negotiation"
  | "closed"
  | "lost";

type Priority = "low" | "medium" | "high";

type Lead = {
  id: string;
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
  const [editingId, setEditingId] = useState<string | null>(null);
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

  const generateLeadId = () =>
    "LEAD-" + Math.floor(10000 + Math.random() * 90000);

  const fetchLeads = async () => {
    const { data, error } = await supabase.from("leads").select("*");

    if (error || !data) {
      console.error("FETCH ERROR:", error);
      return;
    }

    const formatted = data.map((l: any) => ({
      id: l.id,
      leadId: l.lead_id,
      name: l.name,
      company: l.company,
      email: l.email,
      phone: l.phone,
      status: l.status,
      priority: l.priority,
      type: l.type,
      source: l.source,
      jobTitle: l.job_title,
      lastContacted: l.last_contacted || "",
      nextFollowUp: l.next_follow_up || "",
      description: l.description,
    }));

    setLeads(formatted);
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleSubmit = async () => {
    if (!name) return;

    if (editingId) {
      const { error } = await supabase
        .from("leads")
        .update({
          name,
          company,
          email,
          phone,
          status,
          priority,
          type,
          source,
          job_title: jobTitle,
          last_contacted: lastContacted || null,
          next_follow_up: nextFollowUp || null,
          description,
        })
        .eq("id", editingId);

      if (error) console.error("UPDATE ERROR:", error);
    } else {
      const { error } = await supabase.from("leads").insert([
        {
          lead_id: generateLeadId(),
          name,
          company,
          email,
          phone,
          status,
          priority,
          type,
          source,
          job_title: jobTitle,
          last_contacted: lastContacted || null,
          next_follow_up: nextFollowUp || null,
          description,
        },
      ]);

      if (error) console.error("INSERT ERROR:", error);
    }

    resetForm();
    fetchLeads();
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

  const deleteLead = async (id: string) => {
    const { error } = await supabase.from("leads").delete().eq("id", id);
    if (error) console.error("DELETE ERROR:", error);
    fetchLeads();
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
              <p className="font-medium">{lead.name}</p>
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

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={resetForm}>
          <div className="absolute inset-0 bg-black bg-opacity-40"></div>

          <div className="relative bg-white p-6 rounded w-96 space-y-2 z-50 max-h-[90vh] overflow-y-auto" onClick={(e)=>e.stopPropagation()}>

            <h3>{editingId ? "Edit Lead" : "Add Lead"}</h3>

            <input className="border p-2 w-full" placeholder="Name" value={name} onChange={(e)=>setName(e.target.value)} />
            <input className="border p-2 w-full" placeholder="Company" value={company} onChange={(e)=>setCompany(e.target.value)} />
            <input className="border p-2 w-full" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} />
            <input className="border p-2 w-full" placeholder="Phone" value={phone} onChange={(e)=>setPhone(e.target.value)} />

            <input className="border p-2 w-full" placeholder="Job Title" value={jobTitle} onChange={(e)=>setJobTitle(e.target.value)} />
            <input className="border p-2 w-full" placeholder="Lead Source" value={source} onChange={(e)=>setSource(e.target.value)} />
            <input className="border p-2 w-full" placeholder="Type of Lead" value={type} onChange={(e)=>setType(e.target.value)} />

            <select value={priority} onChange={(e)=>setPriority(e.target.value as Priority)} className="border p-2 w-full">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>

            {/* ✅ ADDED LABELS HERE */}
            <div>
              <p className="text-sm font-medium mb-1">Last Contacted</p>
              <input
                type="date"
                className="border p-2 w-full"
                value={lastContacted}
                onChange={(e)=>setLastContacted(e.target.value)}
              />
            </div>

            <div>
              <p className="text-sm font-medium mb-1">Next Follow-up</p>
              <input
                type="date"
                className="border p-2 w-full"
                value={nextFollowUp}
                onChange={(e)=>setNextFollowUp(e.target.value)}
              />
            </div>

            <textarea className="border p-2 w-full" placeholder="Description" value={description} onChange={(e)=>setDescription(e.target.value)} />

            <div className="flex justify-between">
              <button onClick={resetForm}>Cancel</button>
              <button onClick={handleSubmit} className="bg-blue-500 text-white px-3 py-1 rounded">Save</button>
            </div>

          </div>
        </div>
      )}

      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setSelectedLead(null)}>
          <div className="absolute inset-0 bg-black bg-opacity-40"></div>

          <div className="relative bg-white p-6 rounded w-[400px] space-y-3 z-50" onClick={(e)=>e.stopPropagation()}>
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
              <button onClick={() => setSelectedLead(null)}>Close</button>

              <div className="flex gap-3">
                <button onClick={() => { setSelectedLead(null); editLead(selectedLead); }}>
                  Edit
                </button>

                <button onClick={() => { deleteLead(selectedLead.id); setSelectedLead(null); }}>
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