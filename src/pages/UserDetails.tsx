import { useEffect, useState } from "react";
import { supabase } from "../Supabase/supabase";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

type UserRole = "ceo" | "hr" | "manager" | "employee" | "backend_employee";

const UserDetails = () => {
  const navigate = useNavigate();
  const { user, role } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [myProfile, setMyProfile] = useState<any>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>("employee");

  const [form, setForm] = useState<any>({});

  const isHR = role === "hr";
  const isOwnProfile = selectedUserId === user?.id;

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
    if (!user || !role) { setLoading(false); return; }

    try {
      const { data: me } = await supabase
        .from("users").select("*").eq("id", user.id).single();

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
      .from("users").select("*").eq("id", selectedUserId).single();

    if (error) { console.error(error.message); return; }
    setForm(data ?? {});
  };

  useEffect(() => { fetchUsers(); }, [user, role]);
  useEffect(() => { if (selectedUserId) fetchUserDetails(); }, [selectedUserId]);

  /* ── handlers ── */
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm((prev: any) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    if (!isHR || !selectedUserId) return;
    setSaving(true);
    setSaveSuccess(false);

    const payload = {
      // Employee Info
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
      // Emergency Contact
      father_name: form.father_name ?? null,
      mother_name: form.mother_name ?? null,
      father_phone: form.father_phone ?? null,
      mother_phone: form.mother_phone ?? null,
      father_dob: form.father_dob ?? null,
      mother_dob: form.mother_dob ?? null,
      // Address
      permanent_address: form.permanent_address ?? null,
      temporary_address: form.temporary_address ?? null,
      // Banking & Gov
      bank_name: form.bank_name ?? null,
      ifsc_code: form.ifsc_code ?? null,
      account_number: form.account_number ?? null,
      aadhar_number: form.aadhar_number ?? null,
      pan_number: form.pan_number ?? null,
    };

    const { error } = await supabase
      .from("users").update(payload).eq("id", selectedUserId);

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

  /* ── section config ── */
  const sections = [
    { id: "employee",  label: "Employee Info",      icon: "👤" },
    { id: "emergency", label: "Emergency Contact",   icon: "🚨" },
    { id: "address",   label: "Address",             icon: "🏠" },
    { id: "banking",   label: "Banking & Gov.",      icon: "🏦" },
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
            ${!isHR ? "bg-gray-50 text-gray-500 cursor-default" : "bg-white focus:border-gray-400"}`}
        >
          <option value="">— Select —</option>
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
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
            ${!isHR ? "bg-gray-50 text-gray-500 cursor-default" : "bg-white focus:border-gray-400"}`}
        />
      )}
    </div>
  );

  const SectionTitle = ({ title, subtitle }: { title: string; subtitle: string }) => (
    <div className="mb-5">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
      <div className="mt-3 border-t border-gray-100" />
    </div>
  );

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-sm text-gray-400">Loading...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">

      {/* TOP BAR */}
      <div className="bg-white border-b px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="text-sm text-gray-500 hover:text-black transition"
          >
            Back to Dashboard
          </button>
          <span className="text-gray-300">|</span>
          <h1 className="text-base font-semibold text-gray-900">Employee Profiles</h1>
        </div>

        {isHR && (
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

      <div className="flex h-[calc(100vh-65px)]">

        {/* ── SIDEBAR ── */}
        <div className="w-64 border-r bg-white flex flex-col flex-shrink-0 overflow-y-auto">

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
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                selectedUserId === myProfile?.id ? "bg-white/20 text-white" : "bg-gray-200 text-gray-600"
              }`}>
                {(myProfile?.name ?? "U")[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{myProfile?.name ?? "—"}</p>
                <p className={`text-xs capitalize truncate ${
                  selectedUserId === myProfile?.id ? "text-white/60" : "text-gray-400"
                }`}>
                  {myProfile?.role}
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
                      canViewSelected(u.role) ? "cursor-pointer" : "cursor-not-allowed opacity-40"
                    } ${
                      selectedUserId === u.id
                        ? "bg-black text-white"
                        : "hover:bg-gray-100 text-gray-700"
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                      selectedUserId === u.id ? "bg-white/20 text-white" : "bg-gray-200 text-gray-600"
                    }`}>
                      {(u.name ?? "U")[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{u.name ?? "—"}</p>
                      <p className={`text-xs capitalize truncate ${
                        selectedUserId === u.id ? "text-white/60" : "text-gray-400"
                      }`}>
                        {u.role}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── MAIN CONTENT ── */}
        <div className="flex-1 flex overflow-hidden">

          {/* Section Nav */}
          <div className="w-48 border-r bg-white flex flex-col flex-shrink-0 pt-4">
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
                <span className="text-base">{s.icon}</span>
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
          <div className="flex-1 overflow-y-auto p-8">

            {/* ── SECTION 1: Employee Info ── */}
            {activeSection === "employee" && (
              <div className="max-w-2xl">
                <SectionTitle
                  title="Employee Information"
                  subtitle="Basic personal and employment details"
                />

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Full Name" name="name" placeholder="John Doe" />
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Email</label>
                    <input
                      value={form.email ?? ""}
                      disabled
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-400 cursor-default outline-none"
                    />
                  </div>

                  <Field label="Phone Number" name="phone" type="tel" placeholder="+91 98765 43210" />
                  <Field label="Date of Birth" name="dob" type="date" />

                  <Field label="Date of Joining" name="joining_date" type="date" />
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

                  <Field label="Nationality" name="nationality" placeholder="Indian" />
                  <Field label="Department" name="department" placeholder="Engineering" />

                  <Field label="Designation" name="designation" placeholder="Software Engineer" />

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Role</label>
                    <input
                      value={form.role ?? ""}
                      disabled
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-400 cursor-default outline-none capitalize"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── SECTION 2: Emergency Contact ── */}
            {activeSection === "emergency" && (
              <div className="max-w-2xl">
                <SectionTitle
                  title="Emergency Contact"
                  subtitle="Parent details for emergency situations"
                />

                <div className="mb-6">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Father's Details
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Father's Name" name="father_name" placeholder="Full name" />
                    <Field label="Father's Phone" name="father_phone" type="tel" placeholder="+91 98765 43210" />
                    <Field label="Father's Date of Birth" name="father_dob" type="date" />
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-6">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Mother's Details
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Mother's Name" name="mother_name" placeholder="Full name" />
                    <Field label="Mother's Phone" name="mother_phone" type="tel" placeholder="+91 98765 43210" />
                    <Field label="Mother's Date of Birth" name="mother_dob" type="date" />
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
                      placeholder={isHR ? "House No., Street, City, State, PIN" : "—"}
                      className={`w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none transition resize-none
                        ${!isHR ? "bg-gray-50 text-gray-500 cursor-default" : "bg-white focus:border-gray-400"}`}
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
                      placeholder={isHR ? "House No., Street, City, State, PIN" : "—"}
                      className={`w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none transition resize-none
                        ${!isHR ? "bg-gray-50 text-gray-500 cursor-default" : "bg-white focus:border-gray-400"}`}
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
                    <Field label="Bank Name" name="bank_name" placeholder="State Bank of India" />
                    <Field label="IFSC Code" name="ifsc_code" placeholder="SBIN0001234" />
                    <div className="col-span-2">
                      <Field label="Account Number" name="account_number" placeholder="Account number" />
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-6">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Government ID Numbers
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Aadhaar Number" name="aadhar_number" placeholder="XXXX XXXX XXXX" />
                    <Field label="PAN Number" name="pan_number" placeholder="ABCDE1234F" />
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetails;

