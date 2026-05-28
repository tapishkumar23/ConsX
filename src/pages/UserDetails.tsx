import { useEffect, useRef, useState } from "react";
import { supabase } from "../Supabase/supabase";
import { useAuth } from "./AuthContext";
import Layout from "../components/layout/Layout";

type UserRole = "ceo" | "hr" | "manager" | "employee" | "backend_employee";

interface PayrollDoc {
  id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  month: string;
  uploaded_by: string;
  created_at: string;
}

// ── Custom field / section types ──────────────────────────────────────────────

type FieldType = "text" | "number" | "date" | "select" | "textarea" | "tel" | "email";

interface CustomFieldDef {
  id: string;
  section_id: string;      // which section it belongs to
  label: string;
  field_key: string;       // unique snake_case key used as column surrogate
  field_type: FieldType;
  options: string[] | null; // for "select" type
  sort_order: number;
  created_by: string;
}

interface CustomSection {
  id: string;
  section_key: string;     // unique slug
  label: string;
  sort_order: number;
  created_by: string;
}

interface CustomFieldValue {
  id: string;
  user_id: string;
  field_id: string;
  value: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const SectionTitle = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div className="mb-5">
    <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
    <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
    <div className="mt-3 border-t border-gray-100" />
  </div>
);

const Field = ({
  label, name, type = "text", placeholder = "", options, isHR, form, handleChange,
}: {
  label: string; name: string; type?: string; placeholder?: string;
  options?: string[]; isHR: boolean; form: any;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}) => (
  <div>
    <label className="block text-xs text-gray-500 mb-1">{label}</label>
    {options ? (
      <select
        name={name} value={form[name] ?? ""} onChange={handleChange} disabled={!isHR}
        className={`w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none transition
          ${!isHR ? "bg-gray-50 text-gray-500 cursor-default" : "bg-white focus:border-gray-400"}`}
      >
        <option value="">— Select —</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    ) : type === "textarea" ? (
      <textarea
        name={name} value={form[name] ?? ""} onChange={handleChange} disabled={!isHR}
        rows={3} placeholder={isHR ? placeholder : "—"}
        className={`w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none transition resize-none
          ${!isHR ? "bg-gray-50 text-gray-500 cursor-default" : "bg-white focus:border-gray-400"}`}
      />
    ) : (
      <input
        type={type} name={name} value={form[name] ?? ""} onChange={handleChange}
        disabled={!isHR} placeholder={isHR ? placeholder : "—"}
        className={`w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none transition
          ${!isHR ? "bg-gray-50 text-gray-500 cursor-default" : "bg-white focus:border-gray-400"}`}
      />
    )}
  </div>
);

// ── Add Custom Field Modal ────────────────────────────────────────────────────

const AddFieldModal = ({
  sectionId, onClose, onSave,
}: {
  sectionId: string; onClose: () => void;
  onSave: (def: Omit<CustomFieldDef, "id" | "created_by">) => Promise<void>;
}) => {
  const [label, setLabel] = useState("");
  const [fieldType, setFieldType] = useState<FieldType>("text");
  const [optionsRaw, setOptionsRaw] = useState(""); // comma-separated
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const toKey = (s: string) =>
    s.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "").slice(0, 50);

  const handleSubmit = async () => {
    if (!label.trim()) { setErr("Label is required."); return; }
    if (fieldType === "select" && !optionsRaw.trim()) { setErr("Provide at least one option."); return; }
    setSaving(true);
    setErr("");
    const options = fieldType === "select"
      ? optionsRaw.split(",").map((o) => o.trim()).filter(Boolean)
      : null;
    await onSave({
      section_id: sectionId,
      label: label.trim(),
      field_key: `custom_${toKey(label)}_${Date.now()}`,
      field_type: fieldType,
      options,
      sort_order: Date.now(),
    });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-gray-900">Add Custom Field</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Field Label *</label>
            <input
              value={label} onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Emergency Phone"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400 transition"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Field Type</label>
            <select
              value={fieldType} onChange={(e) => setFieldType(e.target.value as FieldType)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400 transition bg-white"
            >
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="date">Date</option>
              <option value="tel">Phone</option>
              <option value="email">Email</option>
              <option value="select">Dropdown</option>
              <option value="textarea">Long Text</option>
            </select>
          </div>
          {fieldType === "select" && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Options (comma-separated) *</label>
              <input
                value={optionsRaw} onChange={(e) => setOptionsRaw(e.target.value)}
                placeholder="Option A, Option B, Option C"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400 transition"
              />
            </div>
          )}
          {err && <p className="text-xs text-red-500">{err}</p>}
        </div>

        <div className="mt-6 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
            Cancel
          </button>
          <button
            onClick={handleSubmit} disabled={saving}
            className="px-5 py-2 text-sm bg-black text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
          >
            {saving ? "Saving..." : "Add Field"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Add Custom Section Modal ──────────────────────────────────────────────────

const AddSectionModal = ({
  onClose, onSave,
}: {
  onClose: () => void;
  onSave: (def: Omit<CustomSection, "id" | "created_by">) => Promise<void>;
}) => {
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const toKey = (s: string) =>
    s.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "").slice(0, 50);

  const handleSubmit = async () => {
    if (!label.trim()) { setErr("Section name is required."); return; }
    setSaving(true);
    setErr("");
    await onSave({
      label: label.trim(),
      section_key: `custom_${toKey(label)}_${Date.now()}`,
      sort_order: Date.now(),
    });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-gray-900">Add Custom Section</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Section Name *</label>
          <input
            value={label} onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Certifications"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400 transition"
          />
          {err && <p className="text-xs text-red-500 mt-2">{err}</p>}
        </div>

        <div className="mt-6 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
            Cancel
          </button>
          <button
            onClick={handleSubmit} disabled={saving}
            className="px-5 py-2 text-sm bg-black text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
          >
            {saving ? "Saving..." : "Add Section"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

const UserDetails = () => {
  const { user, role } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [myProfile, setMyProfile] = useState<any>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>("employee");

  const [form, setForm] = useState<any>({});

  // Payroll state
  const [payrollDocs, setPayrollDocs] = useState<PayrollDoc[]>([]);
  const [payrollLoading, setPayrollLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMonth, setUploadMonth] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Custom field/section state
  const [customSections, setCustomSections] = useState<CustomSection[]>([]);
  const [customFieldDefs, setCustomFieldDefs] = useState<CustomFieldDef[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({}); // field_id -> value
  const [customFieldValuesDb, setCustomFieldValuesDb] = useState<CustomFieldValue[]>([]);

  // Modals
  const [showAddField, setShowAddField] = useState(false);
  const [showAddSection, setShowAddSection] = useState(false);
  const [addFieldTargetSection, setAddFieldTargetSection] = useState<string>("");
  const [deletingFieldId, setDeletingFieldId] = useState<string | null>(null);
  const [deletingSectionId, setDeletingSectionId] = useState<string | null>(null);

  const isHR = role === "hr";
  const isCEO = role === "ceo";
  const canManageStructure = isHR || isCEO; // who can add/delete fields & sections
  const isOwnProfile = selectedUserId === user?.id;

  const selectedMember = teamMembers.find((m) => m.id === selectedUserId);
  const selectedRole: UserRole | null = isOwnProfile ? (role as UserRole) : selectedMember?.role ?? null;

  const canHRManagePayroll = isHR && selectedRole !== "ceo" && selectedUserId !== null;
  const canViewPayroll = isOwnProfile || (isHR && selectedRole !== "ceo");

  // All sections: built-in + custom (sorted)
  const builtInSections = [
    { id: "employee", label: "Employee Info" },
    { id: "emergency", label: "Emergency Contact" },
    { id: "address", label: "Address" },
    { id: "banking", label: "Banking & Gov." },
    { id: "finances", label: "Finances" },
  ];

  const allSections = [
    ...builtInSections,
    ...customSections
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((s) => ({ id: s.id, label: s.label })),
  ];

  const canViewSelected = (targetRole: UserRole) => {
    if (!role) return false;
    if (isOwnProfile) return true;
    if (role === "ceo" || role === "hr") return true;
    if (role === "manager") return targetRole === "employee" || targetRole === "backend_employee";
    return false;
  };

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchUsers = async () => {
    if (!user || !role) { setLoading(false); return; }
    try {
      const { data: me } = await supabase.from("users").select("*").eq("id", user.id).single();
      setMyProfile(me);
      // Only default to own profile on first load; preserve any already-selected user
      setSelectedUserId((prev) => prev ?? user.id);
      setForm((prevForm: any) => Object.keys(prevForm).length > 0 ? prevForm : (me ?? {}));

      if (role === "employee" || role === "backend_employee") {
        setTeamMembers([]);
        setLoading(false);
        return;
      }

      let query = supabase.from("users").select("*").neq("id", user.id);
      if (role === "manager") query = query.in("role", ["employee", "backend_employee"]);
      const { data, error } = await query;
      if (!error)
        setTeamMembers(
          (data || []).sort((a: any, b: any) =>
            (a.name ?? "").localeCompare(b.name ?? "")
          )
        );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails = async () => {
    if (!selectedUserId) return;
    const { data, error } = await supabase.from("users").select("*").eq("id", selectedUserId).single();
    if (error) { console.error(error.message); return; }
    setForm(data ?? {});
  };

  const fetchPayroll = async () => {
    if (!selectedUserId || !canViewPayroll) { setPayrollDocs([]); return; }
    setPayrollLoading(true);
    const { data, error } = await supabase
      .from("payroll_documents").select("*").eq("user_id", selectedUserId)
      .order("month", { ascending: false });
    if (error) console.error("Payroll fetch error:", error.message);
    else setPayrollDocs(data || []);
    setPayrollLoading(false);
  };

  const fetchCustomSections = async () => {
    const { data, error } = await supabase
      .from("custom_sections").select("*").order("sort_order", { ascending: true });
    if (error) console.error("Custom sections fetch error:", error.message);
    else setCustomSections(data || []);
  };

  const fetchCustomFieldDefs = async () => {
    const { data, error } = await supabase
      .from("custom_field_definitions").select("*").order("sort_order", { ascending: true });
    if (error) console.error("Custom field defs fetch error:", error.message);
    else setCustomFieldDefs(data || []);
  };

  const fetchCustomFieldValues = async () => {
    if (!selectedUserId) return;
    const { data, error } = await supabase
      .from("custom_field_values").select("*").eq("user_id", selectedUserId);
    if (error) { console.error("Custom field values fetch error:", error.message); return; }
    const vals = data || [];
    setCustomFieldValuesDb(vals);
    const map: Record<string, string> = {};
    vals.forEach((v) => { map[v.field_id] = v.value; });
    setCustomFieldValues(map);
  };

  useEffect(() => { fetchUsers(); fetchCustomSections(); fetchCustomFieldDefs(); }, [user, role]);
  useEffect(() => {
    if (selectedUserId) {
      fetchUserDetails();
      fetchCustomFieldValues();
      setActiveSection("employee");
    }
  }, [selectedUserId]);
  useEffect(() => { if (activeSection === "finances") fetchPayroll(); }, [activeSection, selectedUserId]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev: any) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCustomValueChange = (fieldId: string, value: string) => {
    setCustomFieldValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleSave = async () => {
    if (!isHR || !selectedUserId) return;
    setSaving(true);
    setSaveSuccess(false);

    const payload = {
      name: form.name ?? null, phone: form.phone ?? null, dob: form.dob ?? null,
      joining_date: form.joining_date ?? null, gender: form.gender ?? null,
      marital_status: form.marital_status ?? null, blood_group: form.blood_group ?? null,
      nationality: form.nationality ?? null, department: form.department ?? null,
      designation: form.designation ?? null, father_name: form.father_name ?? null,
      mother_name: form.mother_name ?? null, father_phone: form.father_phone ?? null,
      mother_phone: form.mother_phone ?? null, father_dob: form.father_dob ?? null,
      mother_dob: form.mother_dob ?? null, permanent_address: form.permanent_address ?? null,
      temporary_address: form.temporary_address ?? null, bank_name: form.bank_name ?? null,
      ifsc_code: form.ifsc_code ?? null, account_number: form.account_number ?? null,
      aadhar_number: form.aadhar_number ?? null, pan_number: form.pan_number ?? null,
    };

    const { error } = await supabase.from("users").update(payload).eq("id", selectedUserId);

    if (error) {
      console.error("Update error:", error.message);
      alert("Failed to save. Check console.");
    } else {
      // Save all custom field values
      for (const fieldDef of customFieldDefs) {
        const value = customFieldValues[fieldDef.id] ?? "";
        const existing = customFieldValuesDb.find(
          (v) => v.field_id === fieldDef.id && v.user_id === selectedUserId
        );

        if (existing) {
          await supabase
            .from("custom_field_values")
            .update({ value })
            .eq("id", existing.id);
        } else if (value) {
          await supabase.from("custom_field_values").insert({
            user_id: selectedUserId,
            field_id: fieldDef.id,
            value,
          });
        }
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      await fetchUsers();
      await fetchUserDetails();
      await fetchCustomFieldValues();
    }

    setSaving(false);
  };

  // ── Custom field/section management ───────────────────────────────────────

  const handleAddField = async (def: Omit<CustomFieldDef, "id" | "created_by">) => {
    if (!user) return;
    const { error } = await supabase.from("custom_field_definitions").insert({
      ...def,
      created_by: user.id,
    });
    if (error) { console.error("Add field error:", error.message); alert("Failed to add field."); return; }
    await fetchCustomFieldDefs();
  };

  const handleDeleteField = async (fieldId: string) => {
    if (!window.confirm("Delete this custom field? All stored values will also be deleted.")) return;
    setDeletingFieldId(fieldId);
    await supabase.from("custom_field_values").delete().eq("field_id", fieldId);
    const { error } = await supabase.from("custom_field_definitions").delete().eq("id", fieldId);
    if (error) alert("Failed to delete field.");
    else { await fetchCustomFieldDefs(); await fetchCustomFieldValues(); }
    setDeletingFieldId(null);
  };

  const handleAddSection = async (def: Omit<CustomSection, "id" | "created_by">) => {
    if (!user) return;
    const { error } = await supabase.from("custom_sections").insert({
      ...def,
      created_by: user.id,
    });
    if (error) { console.error("Add section error:", error.message); alert("Failed to add section."); return; }
    await fetchCustomSections();
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!window.confirm("Delete this section and all its custom fields? This cannot be undone.")) return;
    setDeletingSectionId(sectionId);
    // delete field values and defs for this section
    const fieldIds = customFieldDefs.filter((f) => f.section_id === sectionId).map((f) => f.id);
    for (const fid of fieldIds) {
      await supabase.from("custom_field_values").delete().eq("field_id", fid);
      await supabase.from("custom_field_definitions").delete().eq("id", fid);
    }
    const { error } = await supabase.from("custom_sections").delete().eq("id", sectionId);
    if (error) alert("Failed to delete section.");
    else {
      await fetchCustomSections();
      await fetchCustomFieldDefs();
      setActiveSection("employee");
    }
    setDeletingSectionId(null);
  };

  // ── Payroll handlers ───────────────────────────────────────────────────────

  const handlePayrollUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedUserId || !user) return;
    if (!uploadMonth) { setUploadError("Please select a month before uploading."); return; }
    if (file.type !== "application/pdf") { setUploadError("Only PDF files are allowed."); return; }
    setUploading(true); setUploadError(null); setUploadSuccess(false);

    const filePath = `${selectedUserId}/${uploadMonth}_${file.name}`;
    const { error: storageError } = await supabase.storage
      .from("payroll-docs").upload(filePath, file, { upsert: true });
    if (storageError) { setUploadError("Upload failed: " + storageError.message); setUploading(false); return; }

    const { error: dbError } = await supabase.from("payroll_documents").insert({
      user_id: selectedUserId, file_name: file.name, file_path: filePath,
      month: uploadMonth, uploaded_by: user.id,
    });
    if (dbError) setUploadError("Metadata save failed: " + dbError.message);
    else { setUploadSuccess(true); setTimeout(() => setUploadSuccess(false), 3000); await fetchPayroll(); }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDownload = async (doc: PayrollDoc) => {
    const { data, error } = await supabase.storage.from("payroll-docs").createSignedUrl(doc.file_path, 60);
    if (error || !data?.signedUrl) { alert("Could not generate download link."); return; }
    const link = document.createElement("a");
    link.href = data.signedUrl; link.download = doc.file_name; link.target = "_blank";
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const handleDeletePayroll = async (doc: PayrollDoc) => {
    if (!isHR) return;
    if (!window.confirm(`Delete payroll for ${doc.month}?`)) return;
    const { error: storageError } = await supabase.storage.from("payroll-docs").remove([doc.file_path]);
    if (storageError) { alert("Failed to delete file: " + storageError.message); return; }
    const { error: dbError } = await supabase.from("payroll_documents").delete().eq("id", doc.id);
    if (dbError) alert("Failed to delete record: " + dbError.message);
    else await fetchPayroll();
  };

  const formatMonth = (month: string) => {
    const [year, mon] = month.split("-");
    return new Date(Number(year), Number(mon) - 1).toLocaleString("default", { month: "long", year: "numeric" });
  };

  // ── Custom section renderer ────────────────────────────────────────────────

  const renderCustomSectionFields = (sectionId: string) => {
    const fields = customFieldDefs
      .filter((f) => f.section_id === sectionId)
      .sort((a, b) => a.sort_order - b.sort_order);

    if (fields.length === 0 && !canManageStructure) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-gray-200 rounded-xl">
          <p className="text-sm text-gray-400">No fields have been added to this section yet.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {fields.map((fieldDef) => (
            <div key={fieldDef.id} className="relative group">
              {/* Delete field button (HR/CEO only) */}
              {canManageStructure && (
                <button
                  onClick={() => handleDeleteField(fieldDef.id)}
                  disabled={deletingFieldId === fieldDef.id}
                  title="Remove this field"
                  className="absolute -top-1.5 -right-1.5 z-10 w-5 h-5 rounded-full bg-red-500 text-white
                    items-center justify-center hidden group-hover:flex hover:bg-red-600 transition text-xs"
                >
                  ×
                </button>
              )}

              <label className="block text-xs text-gray-500 mb-1">
                {fieldDef.label}
                <span className="ml-1.5 text-gray-300 font-normal italic">(custom)</span>
              </label>

              {fieldDef.field_type === "select" ? (
                <select
                  value={customFieldValues[fieldDef.id] ?? ""}
                  onChange={(e) => handleCustomValueChange(fieldDef.id, e.target.value)}
                  disabled={!isHR}
                  className={`w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none transition
                    ${!isHR ? "bg-gray-50 text-gray-500 cursor-default" : "bg-white focus:border-gray-400"}`}
                >
                  <option value="">— Select —</option>
                  {(fieldDef.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : fieldDef.field_type === "textarea" ? (
                <textarea
                  value={customFieldValues[fieldDef.id] ?? ""}
                  onChange={(e) => handleCustomValueChange(fieldDef.id, e.target.value)}
                  disabled={!isHR}
                  rows={3}
                  placeholder={isHR ? `Enter ${fieldDef.label.toLowerCase()}` : "—"}
                  className={`w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none transition resize-none
                    ${!isHR ? "bg-gray-50 text-gray-500 cursor-default" : "bg-white focus:border-gray-400"}`}
                />
              ) : (
                <input
                  type={fieldDef.field_type}
                  value={customFieldValues[fieldDef.id] ?? ""}
                  onChange={(e) => handleCustomValueChange(fieldDef.id, e.target.value)}
                  disabled={!isHR}
                  placeholder={isHR ? `Enter ${fieldDef.label.toLowerCase()}` : "—"}
                  className={`w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none transition
                    ${!isHR ? "bg-gray-50 text-gray-500 cursor-default" : "bg-white focus:border-gray-400"}`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Add Field button */}
        {canManageStructure && (
          <button
            onClick={() => { setAddFieldTargetSection(sectionId); setShowAddField(true); }}
            className="mt-2 flex items-center gap-2 px-3 py-2 text-xs text-gray-500 border border-dashed border-gray-300
              rounded-lg hover:border-gray-400 hover:text-gray-700 transition"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add field to this section
          </button>
        )}
      </div>
    );
  };

  // ── Add field button for built-in sections ─────────────────────────────────

  const AddFieldButton = ({ sectionId }: { sectionId: string }) => {
    if (!canManageStructure) return null;
    return (
      <button
        onClick={() => { setAddFieldTargetSection(sectionId); setShowAddField(true); }}
        className="mt-4 flex items-center gap-2 px-3 py-2 text-xs text-gray-500 border border-dashed border-gray-300
          rounded-lg hover:border-gray-400 hover:text-gray-700 transition"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add custom field
      </button>
    );
  };

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* TOP BAR */}
        <div className="bg-white border-b px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-4">
            <span className="text-gray-300">|</span>
            <h1 className="text-base font-semibold text-gray-900">Employee Profiles</h1>
          </div>
          {isHR && activeSection !== "finances" && (
            <div className="flex items-center gap-3">
              {saveSuccess && <span className="text-xs text-emerald-600 font-medium">Saved successfully</span>}
              <button
                onClick={handleSave} disabled={saving}
                className="px-5 py-2 bg-black text-white text-sm rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-65px)]">
          {/* ── SIDEBAR ── */}
          <div className="w-full lg:w-64 border-b lg:border-r bg-white flex flex-col flex-shrink-0 overflow-y-auto max-h-[40vh] lg:max-h-none">
            <div className="p-3 border-b">
              <p className="text-xs text-gray-400 uppercase tracking-wide px-2 mb-2">My Profile</p>
              <div
                onClick={() => setSelectedUserId(myProfile?.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition ${
                  selectedUserId === myProfile?.id ? "bg-black text-white" : "hover:bg-gray-100 text-gray-700"
                }`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                  selectedUserId === myProfile?.id ? "bg-white/20 text-white" : "bg-gray-200 text-gray-600"
                }`}>
                  {(myProfile?.name ?? "U")[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{myProfile?.name ?? "—"}</p>
                  <p className={`text-xs capitalize truncate ${selectedUserId === myProfile?.id ? "text-white/60" : "text-gray-400"}`}>
                    {myProfile?.designation}
                  </p>
                </div>
              </div>
            </div>

            {teamMembers.length > 0 && (
              <div className="p-3">
                <p className="text-xs text-gray-400 uppercase tracking-wide px-2 mb-2">Team Members</p>
                <div className="space-y-1">
                  {teamMembers.map((u) => (
                    <div
                      key={u.id}
                      onClick={() => { if (canViewSelected(u.role)) setSelectedUserId(u.id); }}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${
                        canViewSelected(u.role) ? "cursor-pointer" : "cursor-not-allowed opacity-40"
                      } ${selectedUserId === u.id ? "bg-black text-white" : "hover:bg-gray-100 text-gray-700"}`}
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                        selectedUserId === u.id ? "bg-white/20 text-white" : "bg-gray-200 text-gray-600"
                      }`}>
                        {(u.name ?? "U")[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{u.name ?? "—"}</p>
                        <p className={`text-xs capitalize truncate ${selectedUserId === u.id ? "text-white/60" : "text-gray-400"}`}>
                          {u.designation}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── MAIN CONTENT ── */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* Section Nav */}
            <div className="w-full lg:w-48 border-b lg:border-r bg-white flex lg:flex-col overflow-x-auto lg:overflow-y-auto">
              {allSections.map((s) => {
                const isCustom = customSections.some((cs) => cs.id === s.id);
                return (
                  <div key={s.id} className="relative group/nav flex-shrink-0">
                    <button
                      onClick={() => setActiveSection(s.id)}
                      className={`flex items-center gap-2.5 w-full px-4 py-3 text-left text-sm transition border-l-2 ${
                        activeSection === s.id
                          ? "border-l-black text-gray-900 font-medium bg-gray-50"
                          : "border-l-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                      }`}
                    >
                      <span className="leading-tight flex-1">{s.label}</span>
                      {isCustom && (
                        <span className="text-[9px] text-gray-300 font-medium uppercase tracking-wide">custom</span>
                      )}
                    </button>

                    {/* Delete custom section button */}
                    {isCustom && canManageStructure && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteSection(s.id); }}
                        disabled={deletingSectionId === s.id}
                        title="Delete section"
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-red-100 text-red-400
                          hidden group-hover/nav:flex items-center justify-center hover:bg-red-500 hover:text-white transition text-xs"
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })}

              {/* Add Section button */}
              {canManageStructure && (
                <button
                  onClick={() => setShowAddSection(true)}
                  className="flex items-center gap-2 px-4 py-3 text-xs text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition border-l-2 border-l-transparent w-full"
                >
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Add section</span>
                </button>
              )}

              {isHR && (
                <div className="mt-auto p-4">
                  <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full font-medium">
                    HR — editing enabled
                  </span>
                </div>
              )}
            </div>

            {/* Form Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">

              {/* ── SECTION 1: Employee Info ── */}
              {activeSection === "employee" && (
                <div className="max-w-2xl">
                  <SectionTitle title="Employee Information" subtitle="Basic personal and employment details" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <Field label="Full Name" name="name" placeholder="John Doe" isHR={isHR} form={form} handleChange={handleChange} />
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Email</label>
                      <input value={form.email ?? ""} disabled
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-400 cursor-default outline-none" />
                    </div>
                    <Field label="Phone Number" name="phone" type="tel" placeholder="+91" isHR={isHR} form={form} handleChange={handleChange} />
                    <Field label="Date of Birth" name="dob" type="date" isHR={isHR} form={form} handleChange={handleChange} />
                    <Field label="Date of Joining" name="joining_date" type="date" isHR={isHR} form={form} handleChange={handleChange} />
                    <Field label="Gender" name="gender" options={["Male", "Female", "Other", "Prefer not to say"]} isHR={isHR} form={form} handleChange={handleChange} />
                    <Field label="Marital Status" name="marital_status" options={["Single", "Married", "Divorced", "Widowed"]} isHR={isHR} form={form} handleChange={handleChange} />
                    <Field label="Blood Group" name="blood_group" options={["A+", "A−", "B+", "B−", "AB+", "AB−", "O+", "O−"]} isHR={isHR} form={form} handleChange={handleChange} />
                    <Field label="Nationality" name="nationality" placeholder="Indian" isHR={isHR} form={form} handleChange={handleChange} />
                    <Field label="Department" name="department" placeholder="Engineering" isHR={isHR} form={form} handleChange={handleChange} />
                    <Field label="Designation" name="designation" placeholder="Software Engineer" isHR={isHR} form={form} handleChange={handleChange} />

                    {/* Custom fields for this section */}
                    {customFieldDefs.filter((f) => f.section_id === "employee").sort((a, b) => a.sort_order - b.sort_order).map((fieldDef) => (
                      <div key={fieldDef.id} className="relative group">
                        {canManageStructure && (
                          <button
                            onClick={() => handleDeleteField(fieldDef.id)}
                            disabled={deletingFieldId === fieldDef.id}
                            title="Remove this field"
                            className="absolute -top-1.5 -right-1.5 z-10 w-5 h-5 rounded-full bg-red-500 text-white
                              items-center justify-center hidden group-hover:flex hover:bg-red-600 transition text-xs"
                          >×</button>
                        )}
                        <label className="block text-xs text-gray-500 mb-1">
                          {fieldDef.label}
                          <span className="ml-1.5 text-gray-300 italic">(custom)</span>
                        </label>
                        {fieldDef.field_type === "select" ? (
                          <select value={customFieldValues[fieldDef.id] ?? ""} onChange={(e) => handleCustomValueChange(fieldDef.id, e.target.value)} disabled={!isHR}
                            className={`w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none transition ${!isHR ? "bg-gray-50 text-gray-500 cursor-default" : "bg-white focus:border-gray-400"}`}>
                            <option value="">— Select —</option>
                            {(fieldDef.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : fieldDef.field_type === "textarea" ? (
                          <textarea value={customFieldValues[fieldDef.id] ?? ""} onChange={(e) => handleCustomValueChange(fieldDef.id, e.target.value)} disabled={!isHR} rows={3}
                            className={`w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none transition resize-none ${!isHR ? "bg-gray-50 text-gray-500 cursor-default" : "bg-white focus:border-gray-400"}`} />
                        ) : (
                          <input type={fieldDef.field_type} value={customFieldValues[fieldDef.id] ?? ""} onChange={(e) => handleCustomValueChange(fieldDef.id, e.target.value)} disabled={!isHR}
                            className={`w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none transition ${!isHR ? "bg-gray-50 text-gray-500 cursor-default" : "bg-white focus:border-gray-400"}`} />
                        )}
                      </div>
                    ))}
                  </div>
                  <AddFieldButton sectionId="employee" />
                </div>
              )}

              {/* ── SECTION 2: Emergency Contact ── */}
              {activeSection === "emergency" && (
                <div className="max-w-2xl w-full">
                  <SectionTitle title="Emergency Contact" subtitle="Parent details for emergency situations" />
                  <div className="mb-6">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Father's Details</p>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Father's Name" name="father_name" placeholder="Full name" isHR={isHR} form={form} handleChange={handleChange} />
                      <Field label="Father's Phone" name="father_phone" type="tel" placeholder="+91" isHR={isHR} form={form} handleChange={handleChange} />
                      <Field label="Father's Date of Birth" name="father_dob" type="date" isHR={isHR} form={form} handleChange={handleChange} />
                    </div>
                  </div>
                  <div className="border-t border-gray-100 pt-6">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Mother's Details</p>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Mother's Name" name="mother_name" placeholder="Full name" isHR={isHR} form={form} handleChange={handleChange} />
                      <Field label="Mother's Phone" name="mother_phone" type="tel" placeholder="+91" isHR={isHR} form={form} handleChange={handleChange} />
                      <Field label="Mother's Date of Birth" name="mother_dob" type="date" isHR={isHR} form={form} handleChange={handleChange} />
                    </div>
                  </div>
                  {/* Custom fields */}
                  {customFieldDefs.filter((f) => f.section_id === "emergency").length > 0 && (
                    <div className="border-t border-gray-100 pt-6 mt-6">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Additional Fields</p>
                      <div className="grid grid-cols-2 gap-4">
                        {customFieldDefs.filter((f) => f.section_id === "emergency").sort((a, b) => a.sort_order - b.sort_order).map((fieldDef) => (
                          <div key={fieldDef.id} className="relative group">
                            {canManageStructure && (
                              <button onClick={() => handleDeleteField(fieldDef.id)} disabled={deletingFieldId === fieldDef.id} title="Remove"
                                className="absolute -top-1.5 -right-1.5 z-10 w-5 h-5 rounded-full bg-red-500 text-white items-center justify-center hidden group-hover:flex hover:bg-red-600 transition text-xs">×</button>
                            )}
                            <label className="block text-xs text-gray-500 mb-1">{fieldDef.label}<span className="ml-1.5 text-gray-300 italic">(custom)</span></label>
                            {fieldDef.field_type === "select" ? (
                              <select value={customFieldValues[fieldDef.id] ?? ""} onChange={(e) => handleCustomValueChange(fieldDef.id, e.target.value)} disabled={!isHR}
                                className={`w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none transition ${!isHR ? "bg-gray-50 text-gray-500 cursor-default" : "bg-white focus:border-gray-400"}`}>
                                <option value="">— Select —</option>
                                {(fieldDef.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
                              </select>
                            ) : (
                              <input type={fieldDef.field_type} value={customFieldValues[fieldDef.id] ?? ""} onChange={(e) => handleCustomValueChange(fieldDef.id, e.target.value)} disabled={!isHR}
                                className={`w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none transition ${!isHR ? "bg-gray-50 text-gray-500 cursor-default" : "bg-white focus:border-gray-400"}`} />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <AddFieldButton sectionId="emergency" />
                </div>
              )}

              {/* ── SECTION 3: Address ── */}
              {activeSection === "address" && (
                <div className="max-w-2xl">
                  <SectionTitle title="Address Details" subtitle="Permanent and temporary residential address" />
                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Permanent Address</label>
                      <textarea name="permanent_address" value={form.permanent_address ?? ""} onChange={handleChange} disabled={!isHR} rows={4}
                        placeholder={isHR ? "House No., Street, City, State, PIN" : "—"}
                        className={`w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none transition resize-none ${!isHR ? "bg-gray-50 text-gray-500 cursor-default" : "bg-white focus:border-gray-400"}`} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Temporary / Current Address</label>
                      <textarea name="temporary_address" value={form.temporary_address ?? ""} onChange={handleChange} disabled={!isHR} rows={4}
                        placeholder={isHR ? "House No., Street, City, State, PIN" : "—"}
                        className={`w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none transition resize-none ${!isHR ? "bg-gray-50 text-gray-500 cursor-default" : "bg-white focus:border-gray-400"}`} />
                    </div>
                    {customFieldDefs.filter((f) => f.section_id === "address").length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {customFieldDefs.filter((f) => f.section_id === "address").sort((a, b) => a.sort_order - b.sort_order).map((fieldDef) => (
                          <div key={fieldDef.id} className="relative group">
                            {canManageStructure && (
                              <button onClick={() => handleDeleteField(fieldDef.id)} disabled={deletingFieldId === fieldDef.id} title="Remove"
                                className="absolute -top-1.5 -right-1.5 z-10 w-5 h-5 rounded-full bg-red-500 text-white items-center justify-center hidden group-hover:flex hover:bg-red-600 transition text-xs">×</button>
                            )}
                            <label className="block text-xs text-gray-500 mb-1">{fieldDef.label}<span className="ml-1.5 text-gray-300 italic">(custom)</span></label>
                            <input type={fieldDef.field_type === "textarea" ? "text" : fieldDef.field_type}
                              value={customFieldValues[fieldDef.id] ?? ""} onChange={(e) => handleCustomValueChange(fieldDef.id, e.target.value)} disabled={!isHR}
                              className={`w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none transition ${!isHR ? "bg-gray-50 text-gray-500 cursor-default" : "bg-white focus:border-gray-400"}`} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <AddFieldButton sectionId="address" />
                </div>
              )}

              {/* ── SECTION 4: Banking & Government ── */}
              {activeSection === "banking" && (
                <div className="max-w-2xl">
                  <SectionTitle title="Banking & Government Details" subtitle="Financial and official identification information" />
                  <div className="mb-6">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Bank Details</p>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Bank Name" name="bank_name" placeholder="State Bank of India" isHR={isHR} form={form} handleChange={handleChange} />
                      <Field label="IFSC Code" name="ifsc_code" placeholder="SBIN0001234" isHR={isHR} form={form} handleChange={handleChange} />
                      <div className="col-span-2">
                        <Field label="Account Number" name="account_number" placeholder="Account number" isHR={isHR} form={form} handleChange={handleChange} />
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-gray-100 pt-6">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Government ID Numbers</p>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Aadhaar Number" name="aadhar_number" placeholder="XXXX XXXX XXXX" isHR={isHR} form={form} handleChange={handleChange} />
                      <Field label="PAN Number" name="pan_number" placeholder="ABCDE1234F" isHR={isHR} form={form} handleChange={handleChange} />
                    </div>
                    {customFieldDefs.filter((f) => f.section_id === "banking").length > 0 && (
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        {customFieldDefs.filter((f) => f.section_id === "banking").sort((a, b) => a.sort_order - b.sort_order).map((fieldDef) => (
                          <div key={fieldDef.id} className="relative group">
                            {canManageStructure && (
                              <button onClick={() => handleDeleteField(fieldDef.id)} disabled={deletingFieldId === fieldDef.id} title="Remove"
                                className="absolute -top-1.5 -right-1.5 z-10 w-5 h-5 rounded-full bg-red-500 text-white items-center justify-center hidden group-hover:flex hover:bg-red-600 transition text-xs">×</button>
                            )}
                            <label className="block text-xs text-gray-500 mb-1">{fieldDef.label}<span className="ml-1.5 text-gray-300 italic">(custom)</span></label>
                            <input type={fieldDef.field_type === "textarea" ? "text" : fieldDef.field_type}
                              value={customFieldValues[fieldDef.id] ?? ""} onChange={(e) => handleCustomValueChange(fieldDef.id, e.target.value)} disabled={!isHR}
                              className={`w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none transition ${!isHR ? "bg-gray-50 text-gray-500 cursor-default" : "bg-white focus:border-gray-400"}`} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <AddFieldButton sectionId="banking" />
                </div>
              )}

              {/* ── SECTION 5: Finances ── */}
              {activeSection === "finances" && (
                <div className="max-w-2xl">
                  <SectionTitle title="Finances" subtitle="Monthly payroll documents" />
                  {!canViewPayroll ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m0 0v2m0-2h2m-2 0H10m2-6V9m0 0V7m0 2h2m-2 0H10M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-gray-700">Access Restricted</p>
                      <p className="text-xs text-gray-400 mt-1">You can only view your own payroll documents.</p>
                    </div>
                  ) : (
                    <>
                      {canHRManagePayroll && (
                        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Upload Payroll PDF</p>
                          <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1">
                              <label className="block text-xs text-gray-500 mb-1">Select Month</label>
                              <input type="month" value={uploadMonth} onChange={(e) => setUploadMonth(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white outline-none focus:border-gray-400 transition" />
                            </div>
                            <div className="flex-1">
                              <label className="block text-xs text-gray-500 mb-1">PDF File</label>
                              <input ref={fileInputRef} type="file" accept="application/pdf" onChange={handlePayrollUpload}
                                disabled={uploading || !uploadMonth}
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white outline-none focus:border-gray-400 transition file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-black file:text-white hover:file:bg-gray-800 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" />
                            </div>
                          </div>
                          {uploading && <p className="text-xs text-gray-500 mt-2">Uploading...</p>}
                          {uploadError && <p className="text-xs text-red-500 mt-2">{uploadError}</p>}
                          {uploadSuccess && <p className="text-xs text-emerald-600 mt-2 font-medium">Payroll uploaded successfully.</p>}
                        </div>
                      )}
                      {isHR && !isOwnProfile && selectedRole === "ceo" && (
                        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                          <p className="text-xs text-amber-700 font-medium">Payroll management is not available for the CEO profile.</p>
                        </div>
                      )}
                      {payrollLoading ? (
                        <p className="text-sm text-gray-400">Loading payroll...</p>
                      ) : payrollDocs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-gray-200 rounded-xl">
                          <svg className="w-8 h-8 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <p className="text-sm text-gray-400">No payroll documents yet.</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {payrollDocs.map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                                  <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                  </svg>
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-gray-800 truncate">{formatMonth(doc.month)}</p>
                                  <p className="text-xs text-gray-400 truncate">{doc.file_name}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                                <button onClick={() => handleDownload(doc)} title="Download" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                  </svg>
                                </button>
                                {isHR && (
                                  <button onClick={() => handleDeletePayroll(doc)} title="Delete" className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ── CUSTOM SECTIONS ── */}
              {customSections.map((cs) =>
                activeSection === cs.id ? (
                  <div key={cs.id} className="max-w-2xl">
                    <div className="mb-5 flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">{cs.label}</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Custom section</p>
                        <div className="mt-3 border-t border-gray-100" />
                      </div>
                    </div>
                    {renderCustomSectionFields(cs.id)}
                  </div>
                ) : null
              )}

            </div>
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      {showAddField && (
        <AddFieldModal
          sectionId={addFieldTargetSection}
          onClose={() => setShowAddField(false)}
          onSave={handleAddField}
        />
      )}
      {showAddSection && (
        <AddSectionModal
          onClose={() => setShowAddSection(false)}
          onSave={handleAddSection}
        />
      )}
    </Layout>
  );
};

export default UserDetails;
