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

  const isHR = role === "hr";
  const isOwnProfile = selectedUserId === user?.id;

  // Selected user's role (for payroll gating)
  const selectedMember = teamMembers.find((m) => m.id === selectedUserId);
  const selectedRole: UserRole | null = isOwnProfile
    ? (role as UserRole)
    : selectedMember?.role ?? null;

  // HR cannot upload payroll for CEO
  const canHRManagePayroll =
    isHR && selectedRole !== "ceo" && selectedUserId !== null;

  // Who can VIEW payroll for the selected user?
  // - HR: yes, for anyone except CEO (CEO can view own)
  // - Everyone else: ONLY their own profile
  const canViewPayroll =
    isOwnProfile ||
    (isHR && selectedRole !== "ceo");

  /* ── can this viewer see this profile? ── */
  const canViewSelected = (targetRole: UserRole) => {
    if (!role) return false;
    if (isOwnProfile) return true;
    if (role === "ceo" || role === "hr") return true;
    if (role === "manager") {
      return targetRole === "employee" || targetRole === "backend_employee";
    }
    return false;
  };

  /* ── fetch sidebar ── */
  const fetchUsers = async () => {
    if (!user || !role) {
      setLoading(false);
      return;
    }

    try {
      const { data: me } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      setMyProfile(me);
      setSelectedUserId(user.id);
      setForm(me ?? {});

      if (role === "employee" || role === "backend_employee") {
        setTeamMembers([]);
        setLoading(false);
        return;
      }

      let query = supabase.from("users").select("*").neq("id", user.id);
      if (role === "manager") {
        query = query.in("role", ["employee", "backend_employee"]);
      }

      const { data, error } = await query;
      if (!error) setTeamMembers(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /* ── fetch selected user ── */
  const fetchUserDetails = async () => {
    if (!selectedUserId) return;

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", selectedUserId)
      .single();

    if (error) {
      console.error(error.message);
      return;
    }
    setForm(data ?? {});
  };

  /* ── fetch payroll docs for selected user ── */
  const fetchPayroll = async () => {
    if (!selectedUserId || !canViewPayroll) {
      setPayrollDocs([]);
      return;
    }

    setPayrollLoading(true);
    const { data, error } = await supabase
      .from("payroll_documents")
      .select("*")
      .eq("user_id", selectedUserId)
      .order("month", { ascending: false });

    if (error) {
      console.error("Payroll fetch error:", error.message);
    } else {
      setPayrollDocs(data || []);
    }
    setPayrollLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, [user, role]);

  useEffect(() => {
    if (selectedUserId) fetchUserDetails();
  }, [selectedUserId]);

  useEffect(() => {
    if (activeSection === "finances") fetchPayroll();
  }, [activeSection, selectedUserId]);

  /* ── handlers ── */
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setForm((prev: any) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    if (!isHR || !selectedUserId) return;
    setSaving(true);
    setSaveSuccess(false);

    const payload = {
      name: form.name ?? null,
      phone: form.phone ?? null,
      dob: form.dob ?? null,
      joining_date: form.joining_date ?? null,
      gender: form.gender ?? null,
      marital_status: form.marital_status ?? null,
      blood_group: form.blood_group ?? null,
      nationality: form.nationality ?? null,
      department: form.department ?? null,
      designation: form.designation ?? null,
      father_name: form.father_name ?? null,
      mother_name: form.mother_name ?? null,
      father_phone: form.father_phone ?? null,
      mother_phone: form.mother_phone ?? null,
      father_dob: form.father_dob ?? null,
      mother_dob: form.mother_dob ?? null,
      permanent_address: form.permanent_address ?? null,
      temporary_address: form.temporary_address ?? null,
      bank_name: form.bank_name ?? null,
      ifsc_code: form.ifsc_code ?? null,
      account_number: form.account_number ?? null,
      aadhar_number: form.aadhar_number ?? null,
      pan_number: form.pan_number ?? null,
    };

    const { error } = await supabase
      .from("users")
      .update(payload)
      .eq("id", selectedUserId);

    if (error) {
      console.error("Update error:", error.message);
      alert("Failed to save. Check console.");
    } else {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      await fetchUsers();
      await fetchUserDetails();
    }

    setSaving(false);
  };

  /* ── Payroll upload ── */
  const handlePayrollUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file || !selectedUserId || !user) return;

    if (!uploadMonth) {
      setUploadError("Please select a month before uploading.");
      return;
    }

    if (file.type !== "application/pdf") {
      setUploadError("Only PDF files are allowed.");
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    // Store as: {user_id}/{month}_{originalname}
    const safeMonth = uploadMonth; // "YYYY-MM"
    const filePath = `${selectedUserId}/${safeMonth}_${file.name}`;

    const { error: storageError } = await supabase.storage
      .from("payroll-docs")
      .upload(filePath, file, { upsert: true });

    if (storageError) {
      console.error("Storage upload error:", storageError.message);
      setUploadError("Upload failed: " + storageError.message);
      setUploading(false);
      return;
    }

    // Insert record into payroll_documents
    const { error: dbError } = await supabase.from("payroll_documents").insert({
      user_id: selectedUserId,
      file_name: file.name,
      file_path: filePath,
      month: safeMonth,
      uploaded_by: user.id,
    });

    if (dbError) {
      console.error("DB insert error:", dbError.message);
      setUploadError("Metadata save failed: " + dbError.message);
    } else {
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
      await fetchPayroll();
    }

    setUploading(false);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /* ── Payroll download ── */
  const handleDownload = async (doc: PayrollDoc) => {
    const { data, error } = await supabase.storage
      .from("payroll-docs")
      .createSignedUrl(doc.file_path, 60); // 60 second signed URL

    if (error || !data?.signedUrl) {
      alert("Could not generate download link. Please try again.");
      return;
    }

    const link = document.createElement("a");
    link.href = data.signedUrl;
    link.download = doc.file_name;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /* ── Payroll delete ── */
  const handleDeletePayroll = async (doc: PayrollDoc) => {
    if (!isHR) return;
    if (!window.confirm(`Delete payroll for ${doc.month}?`)) return;

    const { error: storageError } = await supabase.storage
      .from("payroll-docs")
      .remove([doc.file_path]);

    if (storageError) {
      alert("Failed to delete file: " + storageError.message);
      return;
    }

    const { error: dbError } = await supabase
      .from("payroll_documents")
      .delete()
      .eq("id", doc.id);

    if (dbError) {
      alert("Failed to delete record: " + dbError.message);
    } else {
      await fetchPayroll();
    }
  };

  /* ── Format month display ── */
  const formatMonth = (month: string) => {
    const [year, mon] = month.split("-");
    const date = new Date(Number(year), Number(mon) - 1);
    return date.toLocaleString("default", { month: "long", year: "numeric" });
  };

  /* ── section config ── */
  const sections = [
    { id: "employee", label: "Employee Info" },
    { id: "emergency", label: "Emergency Contact" },
    { id: "address", label: "Address" },
    { id: "banking", label: "Banking & Gov." },
    { id: "finances", label: "Finances" },
  ];

  /* ── field helpers ── */
  const Field = ({
    label,
    name,
    type = "text",
    placeholder = "",
    options,
  }: {
    label: string;
    name: string;
    type?: string;
    placeholder?: string;
    options?: string[];
  }) => (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      {options ? (
        <select
          name={name}
          value={form[name] ?? ""}
          onChange={handleChange}
          disabled={!isHR}
          className={`w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none transition
            ${
              !isHR
                ? "bg-gray-50 text-gray-500 cursor-default"
                : "bg-white focus:border-gray-400"
            }`}
        >
          <option value="">— Select —</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          name={name}
          value={form[name] ?? ""}
          onChange={handleChange}
          disabled={!isHR}
          placeholder={isHR ? placeholder : "—"}
          className={`w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none transition
            ${
              !isHR
                ? "bg-gray-50 text-gray-500 cursor-default"
                : "bg-white focus:border-gray-400"
            }`}
        />
      )}
    </div>
  );

  const SectionTitle = ({
    title,
    subtitle,
  }: {
    title: string;
    subtitle: string;
  }) => (
    <div className="mb-5">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
      <div className="mt-3 border-t border-gray-100" />
    </div>
  );

  if (loading)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    );

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* TOP BAR */}
        <div className="bg-white border-b px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-4">
            <span className="text-gray-300">|</span>
            <h1 className="text-base font-semibold text-gray-900">
              Employee Profiles
            </h1>
          </div>

          {isHR && activeSection !== "finances" && (
            <div className="flex items-center gap-3">
              {saveSuccess && (
                <span className="text-xs text-emerald-600 font-medium">
                  Saved successfully
                </span>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
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
            {/* My Profile */}
            <div className="p-3 border-b">
              <p className="text-xs text-gray-400 uppercase tracking-wide px-2 mb-2">
                My Profile
              </p>
              <div
                onClick={() => setSelectedUserId(myProfile?.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition ${
                  selectedUserId === myProfile?.id
                    ? "bg-black text-white"
                    : "hover:bg-gray-100 text-gray-700"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                    selectedUserId === myProfile?.id
                      ? "bg-white/20 text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {(myProfile?.name ?? "U")[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {myProfile?.name ?? "—"}
                  </p>
                  <p
                    className={`text-xs capitalize truncate ${
                      selectedUserId === myProfile?.id
                        ? "text-white/60"
                        : "text-gray-400"
                    }`}
                  >
                    {myProfile?.designation}
                  </p>
                </div>
              </div>
            </div>

            {/* Team Members */}
            {teamMembers.length > 0 && (
              <div className="p-3">
                <p className="text-xs text-gray-400 uppercase tracking-wide px-2 mb-2">
                  Team Members
                </p>
                <div className="space-y-1">
                  {teamMembers.map((u) => (
                    <div
                      key={u.id}
                      onClick={() => {
                        if (canViewSelected(u.role)) setSelectedUserId(u.id);
                      }}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${
                        canViewSelected(u.role)
                          ? "cursor-pointer"
                          : "cursor-not-allowed opacity-40"
                      } ${
                        selectedUserId === u.id
                          ? "bg-black text-white"
                          : "hover:bg-gray-100 text-gray-700"
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                          selectedUserId === u.id
                            ? "bg-white/20 text-white"
                            : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {(u.name ?? "U")[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {u.name ?? "—"}
                        </p>
                        <p
                          className={`text-xs capitalize truncate ${
                            selectedUserId === u.id
                              ? "text-white/60"
                              : "text-gray-400"
                          }`}
                        >
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
            <div className="w-full lg:w-48 border-b lg:border-r bg-white flex lg:flex-col overflow-x-auto lg:overflow-visible">
              {sections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className={`flex items-center gap-2.5 px-4 py-3 text-left text-sm transition border-l-2 ${
                    activeSection === s.id
                      ? "border-l-black text-gray-900 font-medium bg-gray-50"
                      : "border-l-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                  }`}
                >
                  <span className="leading-tight">{s.label}</span>
                </button>
              ))}

              {/* HR badge */}
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
                  <SectionTitle
                    title="Employee Information"
                    subtitle="Basic personal and employment details"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <Field
                      label="Full Name"
                      name="name"
                      placeholder="John Doe"
                    />
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Email
                      </label>
                      <input
                        value={form.email ?? ""}
                        disabled
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-400 cursor-default outline-none"
                      />
                    </div>

                    <Field
                      label="Phone Number"
                      name="phone"
                      type="tel"
                      placeholder="+91"
                    />
                    <Field label="Date of Birth" name="dob" type="date" />

                    <Field
                      label="Date of Joining"
                      name="joining_date"
                      type="date"
                    />
                    <Field
                      label="Gender"
                      name="gender"
                      options={["Male", "Female", "Other", "Prefer not to say"]}
                    />

                    <Field
                      label="Marital Status"
                      name="marital_status"
                      options={["Single", "Married", "Divorced", "Widowed"]}
                    />
                    <Field
                      label="Blood Group"
                      name="blood_group"
                      options={["A+", "A−", "B+", "B−", "AB+", "AB−", "O+", "O−"]}
                    />

                    <Field
                      label="Nationality"
                      name="nationality"
                      placeholder="Indian"
                    />
                    <Field
                      label="Department"
                      name="department"
                      placeholder="Engineering"
                    />

                    <Field
                      label="Designation"
                      name="designation"
                      placeholder="Software Engineer"
                    />
                  </div>
                </div>
              )}

              {/* ── SECTION 2: Emergency Contact ── */}
              {activeSection === "emergency" && (
                <div className="max-w-2xl w-full">
                  <SectionTitle
                    title="Emergency Contact"
                    subtitle="Parent details for emergency situations"
                  />

                  <div className="mb-6">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                      Father's Details
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <Field
                        label="Father's Name"
                        name="father_name"
                        placeholder="Full name"
                      />
                      <Field
                        label="Father's Phone"
                        name="father_phone"
                        type="tel"
                        placeholder="+91"
                      />
                      <Field
                        label="Father's Date of Birth"
                        name="father_dob"
                        type="date"
                      />
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-6">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                      Mother's Details
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <Field
                        label="Mother's Name"
                        name="mother_name"
                        placeholder="Full name"
                      />
                      <Field
                        label="Mother's Phone"
                        name="mother_phone"
                        type="tel"
                        placeholder="+91"
                      />
                      <Field
                        label="Mother's Date of Birth"
                        name="mother_dob"
                        type="date"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ── SECTION 3: Address ── */}
              {activeSection === "address" && (
                <div className="max-w-2xl">
                  <SectionTitle
                    title="Address Details"
                    subtitle="Permanent and temporary residential address"
                  />

                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Permanent Address
                      </label>
                      <textarea
                        name="permanent_address"
                        value={form.permanent_address ?? ""}
                        onChange={handleChange}
                        disabled={!isHR}
                        rows={4}
                        placeholder={
                          isHR ? "House No., Street, City, State, PIN" : "—"
                        }
                        className={`w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none transition resize-none
                          ${
                            !isHR
                              ? "bg-gray-50 text-gray-500 cursor-default"
                              : "bg-white focus:border-gray-400"
                          }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Temporary / Current Address
                      </label>
                      <textarea
                        name="temporary_address"
                        value={form.temporary_address ?? ""}
                        onChange={handleChange}
                        disabled={!isHR}
                        rows={4}
                        placeholder={
                          isHR ? "House No., Street, City, State, PIN" : "—"
                        }
                        className={`w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none transition resize-none
                          ${
                            !isHR
                              ? "bg-gray-50 text-gray-500 cursor-default"
                              : "bg-white focus:border-gray-400"
                          }`}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ── SECTION 4: Banking & Government ── */}
              {activeSection === "banking" && (
                <div className="max-w-2xl">
                  <SectionTitle
                    title="Banking & Government Details"
                    subtitle="Financial and official identification information"
                  />

                  <div className="mb-6">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                      Bank Details
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <Field
                        label="Bank Name"
                        name="bank_name"
                        placeholder="State Bank of India"
                      />
                      <Field
                        label="IFSC Code"
                        name="ifsc_code"
                        placeholder="SBIN0001234"
                      />
                      <div className="col-span-2">
                        <Field
                          label="Account Number"
                          name="account_number"
                          placeholder="Account number"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-6">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                      Government ID Numbers
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <Field
                        label="Aadhaar Number"
                        name="aadhar_number"
                        placeholder="XXXX XXXX XXXX"
                      />
                      <Field
                        label="PAN Number"
                        name="pan_number"
                        placeholder="ABCDE1234F"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ── SECTION 5: Finances ── */}
              {activeSection === "finances" && (
                <div className="max-w-2xl">
                  <SectionTitle
                    title="Finances"
                    subtitle="Monthly payroll documents"
                  />

                  {/* Access denied for managers viewing others */}
                  {!canViewPayroll ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                        <svg
                          className="w-6 h-6 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M12 15v2m0 0v2m0-2h2m-2 0H10m2-6V9m0 0V7m0 2h2m-2 0H10M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-gray-700">
                        Access Restricted
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        You can only view your own payroll documents.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* HR Upload Panel */}
                      {canHRManagePayroll && (
                        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                            Upload Payroll PDF
                          </p>
                          <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1">
                              <label className="block text-xs text-gray-500 mb-1">
                                Select Month
                              </label>
                              <input
                                type="month"
                                value={uploadMonth}
                                onChange={(e) =>
                                  setUploadMonth(e.target.value)
                                }
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white outline-none focus:border-gray-400 transition"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="block text-xs text-gray-500 mb-1">
                                PDF File
                              </label>
                              <input
                                ref={fileInputRef}
                                type="file"
                                accept="application/pdf"
                                onChange={handlePayrollUpload}
                                disabled={uploading || !uploadMonth}
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white outline-none focus:border-gray-400 transition
                                  file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium
                                  file:bg-black file:text-white hover:file:bg-gray-800 cursor-pointer
                                  disabled:opacity-50 disabled:cursor-not-allowed"
                              />
                            </div>
                          </div>

                          {uploading && (
                            <p className="text-xs text-gray-500 mt-2">
                              Uploading...
                            </p>
                          )}
                          {uploadError && (
                            <p className="text-xs text-red-500 mt-2">
                              {uploadError}
                            </p>
                          )}
                          {uploadSuccess && (
                            <p className="text-xs text-emerald-600 mt-2 font-medium">
                              Payroll uploaded successfully.
                            </p>
                          )}
                        </div>
                      )}

                      {/* HR cannot upload for CEO */}
                      {isHR && !isOwnProfile && selectedRole === "ceo" && (
                        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                          <p className="text-xs text-amber-700 font-medium">
                            Payroll management is not available for the CEO
                            profile.
                          </p>
                        </div>
                      )}

                      {/* Payroll List */}
                      {payrollLoading ? (
                        <p className="text-sm text-gray-400">
                          Loading payroll...
                        </p>
                      ) : payrollDocs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-gray-200 rounded-xl">
                          <svg
                            className="w-8 h-8 text-gray-300 mb-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          <p className="text-sm text-gray-400">
                            No payroll documents yet.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {payrollDocs.map((doc) => (
                            <div
                              key={doc.id}
                              className="flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                {/* PDF icon */}
                                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                                  <svg
                                    className="w-4 h-4 text-red-500"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-gray-800 truncate">
                                    {formatMonth(doc.month)}
                                  </p>
                                  <p className="text-xs text-gray-400 truncate">
                                    {doc.file_name}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                                {/* Download */}
                                <button
                                  onClick={() => handleDownload(doc)}
                                  title="Download"
                                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition"
                                >
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                                    />
                                  </svg>
                                </button>

                                {/* HR Delete */}
                                {isHR && (
                                  <button
                                    onClick={() => handleDeletePayroll(doc)}
                                    title="Delete"
                                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition"
                                  >
                                    <svg
                                      className="w-4 h-4"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                      />
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
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default UserDetails;
