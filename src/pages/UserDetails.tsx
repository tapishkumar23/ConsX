import { useEffect, useState } from "react";
import { supabase } from "../Supabase/supabase";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

type DocType = "aadhar" | "pan";

interface DocUrls {
  aadhar: string | null;
  pan: string | null;
}

const UserDetails = () => {
  const navigate = useNavigate();
  const { user, role } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [myProfile, setMyProfile] = useState<any>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const [form, setForm] = useState<any>({});
  const [docUrls, setDocUrls] = useState<DocUrls>({ aadhar: null, pan: null });
  const [files, setFiles] = useState<{ aadhar: File | null; pan: File | null }>({
    aadhar: null,
    pan: null,
  });

  const isOwnProfile = selectedUserId === user?.id;
  const canViewDocs = () => role === "hr" || isOwnProfile;
  const canEdit = () => role === "hr";

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

    setDocUrls({ aadhar: null, pan: null });
    setFiles({ aadhar: null, pan: null });

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", selectedUserId)
      .single();

    if (error) {
      console.error(error.message);
      return;
    }

    setForm(data);

    const viewerIsHR = role === "hr";
    const viewerIsOwner = selectedUserId === user?.id;

    if (viewerIsHR || viewerIsOwner) {
      const newDocUrls: DocUrls = { aadhar: null, pan: null };

      for (const docType of ["aadhar", "pan"] as DocType[]) {
        const path = data[`${docType}_url`];
        if (path) {
          const { data: signed } = await supabase.storage
            .from("employee-documents")
            .createSignedUrl(path, 60 * 60);
          newDocUrls[docType] = signed?.signedUrl ?? null;
        }
      }

      setDocUrls(newDocUrls);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [user, role]);

  useEffect(() => {
    if (selectedUserId) fetchUserDetails();
  }, [selectedUserId]);

  /* ── handlers ── */
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFileChange = (docType: DocType, file: File | null) => {
    setFiles((prev) => ({ ...prev, [docType]: file }));
  };

  const uploadDoc = async (
    docType: DocType,
    targetUserId: string
  ): Promise<string | null> => {
    const file = files[docType];
    if (!file) return form[`${docType}_url`] ?? null;

    const ext = file.name.split(".").pop();
    const path = `${targetUserId}/${docType}_${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from("employee-documents")
      .upload(path, file, { upsert: true });

    if (error) {
      console.error(`Upload error (${docType}):`, error.message);
      return null;
    }
    return path;
  };

  const handleSave = async () => {
    if (!canEdit() || !selectedUserId) return;
    setSaving(true);

    const aadharPath = await uploadDoc("aadhar", selectedUserId);
    const panPath = await uploadDoc("pan", selectedUserId);

    const payload = {
      name: form.name ?? null,
      dob: form.dob ?? null,
      phone: form.phone ?? null,
      address: form.address ?? null,
      department: form.department ?? null,
      designation: form.designation ?? null,
      joining_date: form.joining_date ?? null,
      aadhar_url: aadharPath,
      pan_url: panPath,
    };

    const { error } = await supabase
      .from("users")
      .update(payload)
      .eq("id", selectedUserId);

    if (error) {
      console.error("Update error:", error.message);
      alert("Failed to save. Check console.");
    } else {
      alert("Saved successfully!");
      await fetchUsers();
      await fetchUserDetails();
    }

    setSaving(false);
  };

  /* ── DocUploadRow ── */
  const DocUploadRow = ({
    docType,
    label,
  }: {
    docType: DocType;
    label: string;
  }) => {
    const signedUrl = docUrls[docType];
    const selectedFile = files[docType];

    return (
      <div className="border border-dashed border-gray-300 rounded-lg p-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700">{label}</p>
          {signedUrl != null && (
            <a
              href={signedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 underline"
            >
              View current
            </a>
          )}
        </div>

        {signedUrl == null && selectedFile == null && (
          <p className="text-xs text-gray-400 italic">
            No document uploaded yet.
          </p>
        )}

        {canEdit() && (
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) =>
              handleFileChange(docType, e.target.files?.[0] ?? null)
            }
            className="text-xs text-gray-600 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
          />
        )}

        {selectedFile != null && (
          <p className="text-xs text-green-600">
            Ready to upload: {selectedFile.name}
          </p>
        )}
      </div>
    );
  };

  /* ── render ── */
  if (loading) {
    return <div className="p-6 text-sm text-gray-500">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* TOP BAR */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => navigate("/")}
          className="text-sm text-gray-500 hover:text-black transition"
        >
          Back to Dashboard
        </button>
        <h1 className="font-semibold text-lg tracking-tight">
          Employee Profiles
        </h1>
        <div />
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* LEFT SIDEBAR */}
        <div className="space-y-4">
          {/* My Profile */}
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
              My Profile
            </p>
            <div
              onClick={() => setSelectedUserId(myProfile?.id)}
              className={`p-3 rounded-lg cursor-pointer transition ${
                selectedUserId === myProfile?.id
                  ? "bg-black text-white"
                  : "hover:bg-gray-100"
              }`}
            >
              <p className="text-sm font-medium">{myProfile?.name ?? "—"}</p>
              <p className="text-xs opacity-60 capitalize">
                {myProfile?.role}
              </p>
            </div>
          </div>

          {/* Team Members */}
          {teamMembers.length > 0 && (
            <div className="bg-white rounded-xl border p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
                Team Members
              </p>
              <div className="space-y-1">
                {teamMembers.map((u) => (
                  <div
                    key={u.id}
                    onClick={() => setSelectedUserId(u.id)}
                    className={`p-3 rounded-lg cursor-pointer transition ${
                      selectedUserId === u.id
                        ? "bg-black text-white"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    <p className="text-sm font-medium">{u.name ?? "—"}</p>
                    <p className="text-xs opacity-60 capitalize">{u.role}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL */}
        <div className="col-span-2 space-y-6">
          {/* Profile Details */}
          <div className="bg-white rounded-xl border p-6">
            <h2 className="text-sm font-semibold mb-4">Profile Details</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500">Full Name</label>
                <input
                  name="name"
                  value={form.name ?? ""}
                  onChange={handleChange}
                  disabled={!canEdit()}
                  className="input mt-1"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500">Email</label>
                <input
                  value={form.email ?? ""}
                  disabled
                  className="input mt-1 bg-gray-50 text-gray-400"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500">Date of Birth</label>
                <input
                  type="date"
                  name="dob"
                  value={form.dob ?? ""}
                  onChange={handleChange}
                  disabled={!canEdit()}
                  className="input mt-1"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500">Phone</label>
                <input
                  name="phone"
                  value={form.phone ?? ""}
                  onChange={handleChange}
                  disabled={!canEdit()}
                  className="input mt-1"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500">Department</label>
                <input
                  name="department"
                  value={form.department ?? ""}
                  onChange={handleChange}
                  disabled={!canEdit()}
                  className="input mt-1"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500">Designation</label>
                <input
                  name="designation"
                  value={form.designation ?? ""}
                  onChange={handleChange}
                  disabled={!canEdit()}
                  className="input mt-1"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500">Joining Date</label>
                <input
                  type="date"
                  name="joining_date"
                  value={form.joining_date ?? ""}
                  onChange={handleChange}
                  disabled={!canEdit()}
                  className="input mt-1"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500">Role</label>
                <input
                  value={form.role ?? ""}
                  disabled
                  className="input mt-1 bg-gray-50 text-gray-400 capitalize"
                />
              </div>

              <div className="col-span-2">
                <label className="text-xs text-gray-500">Address</label>
                <textarea
                  name="address"
                  value={form.address ?? ""}
                  onChange={handleChange}
                  disabled={!canEdit()}
                  rows={3}
                  className="input mt-1 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Documents */}
          {canViewDocs() && (
            <div className="bg-white rounded-xl border p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold">Identity Documents</h2>
                {canEdit() ? (
                  <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                    HR — can upload
                  </span>
                ) : (
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                    View only
                  </span>
                )}
              </div>

              <div className="space-y-3">
                <DocUploadRow docType="aadhar" label="Aadhaar Card" />
                <DocUploadRow docType="pan" label="PAN Card" />
              </div>
            </div>
          )}

          {/* Save — HR only */}
          {canEdit() && (
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-black text-white text-sm rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserDetails;
