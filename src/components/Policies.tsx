import { useEffect, useRef, useState } from "react";
import { supabase } from "../Supabase/supabase";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../pages/AuthContext";

interface Policy {
  id: string;
  title: string;
  description: string | null;
  file_path: string;
  category: string | null;
  created_at: string;
  uploaded_by: string | null;
}

const CATEGORIES = [
  "All",
  "HR Policies",
  "Leave & Attendance",
  "Code of Conduct",
  "IT & Security",
  "Finance",
  "Other",
];

const CompanyPolicies = () => {
  const navigate = useNavigate();
  const { user, role } = useAuth();

  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");

  // HR upload state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDesc, setUploadDesc] = useState("");
  const [uploadCategory, setUploadCategory] = useState("Other");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Policy | null>(null);
  const [deleting, setDeleting] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const isHR = role === "hr";

  /* ── fetch policies ── */
  const fetchPolicies = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("policies")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) setPolicies(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  /* ── open policy viewer ── */
  const handleOpenPolicy = async (policy: Policy) => {
    setSelectedPolicy(policy);
    setPdfUrl(null);
    setLoadingPdf(true);

    const { data, error } = await supabase.storage
      .from("company-policies")
      .createSignedUrl(policy.file_path, 60 * 60); // 1 hour, no download

    if (error) {
      console.error(error.message);
      setLoadingPdf(false);
      return;
    }

    // Append #toolbar=0 to hide PDF download button in most browsers
    setPdfUrl((data?.signedUrl ?? "") + "#toolbar=0&navpanes=0");
    setLoadingPdf(false);
  };

  /* ── upload policy (HR) ── */
  const handleUpload = async () => {
    if (!uploadFile || !uploadTitle.trim()) {
      setUploadError("Title and file are required.");
      return;
    }
    setUploading(true);
    setUploadError(null);

    const ext = uploadFile.name.split(".").pop();
    const filePath = `policies/${Date.now()}_${uploadTitle.replace(/\s+/g, "_")}.${ext}`;

    const { error: storageError } = await supabase.storage
      .from("company-policies")
      .upload(filePath, uploadFile, { upsert: false });

    if (storageError) {
      setUploadError(storageError.message);
      setUploading(false);
      return;
    }

    const { error: dbError } = await supabase.from("policies").insert({
      title: uploadTitle.trim(),
      description: uploadDesc.trim() || null,
      file_path: filePath,
      category: uploadCategory,
      uploaded_by: user?.id ?? null,
    });

    if (dbError) {
      setUploadError(dbError.message);
      setUploading(false);
      return;
    }

    setShowUploadModal(false);
    setUploadFile(null);
    setUploadTitle("");
    setUploadDesc("");
    setUploadCategory("Other");
    await fetchPolicies();
    setUploading(false);
  };

  /* ── delete policy (HR) ── */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);

    await supabase.storage
      .from("company-policies")
      .remove([deleteTarget.file_path]);

    await supabase.from("policies").delete().eq("id", deleteTarget.id);

    if (selectedPolicy?.id === deleteTarget.id) {
      setSelectedPolicy(null);
      setPdfUrl(null);
    }

    setDeleteTarget(null);
    await fetchPolicies();
    setDeleting(false);
  };

  /* ── filtered list ── */
  const filtered =
    activeCategory === "All"
      ? policies
      : policies.filter((p) => p.category === activeCategory);

  /* ── format date ── */
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  /* ── category badge color ── */
  const categoryColor = (cat: string | null) => {
    const map: Record<string, string> = {
      "HR Policies": "bg-violet-100 text-violet-700",
      "Leave & Attendance": "bg-blue-100 text-blue-700",
      "Code of Conduct": "bg-amber-100 text-amber-700",
      "IT & Security": "bg-cyan-100 text-cyan-700",
      Finance: "bg-emerald-100 text-emerald-700",
      Other: "bg-gray-100 text-gray-600",
    };
    return map[cat ?? "Other"] ?? "bg-gray-100 text-gray-600";
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* ── HEADER ── */}
      <div className="bg-white border-b px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="text-sm text-gray-500 hover:text-black transition"
          >
            Back to Dashboard
          </button>
          <span className="text-gray-300">|</span>
          <h1 className="text-base font-semibold text-gray-900">
            Company Policies
          </h1>
        </div>

        {isHR && (
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white text-sm rounded-lg hover:bg-gray-800 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Upload Policy
          </button>
        )}
      </div>

      <div className="flex h-[calc(100vh-65px)]">
        {/* ── LEFT: Policy List ── */}
        <div className="w-80 border-r bg-white flex flex-col flex-shrink-0">
          {/* Category Filter */}
          <div className="p-4 border-b">
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                    activeCategory === cat
                      ? "bg-black text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-6 text-sm text-gray-400">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-sm text-gray-400 text-center">
                No policies in this category.
              </div>
            ) : (
              filtered.map((policy) => (
                <div
                  key={policy.id}
                  onClick={() => handleOpenPolicy(policy)}
                  className={`group relative p-4 border-b cursor-pointer transition ${
                    selectedPolicy?.id === policy.id
                      ? "bg-gray-50 border-l-2 border-l-black"
                      : "hover:bg-gray-50 border-l-2 border-l-transparent"
                  }`}
                >
                  {/* PDF icon + title */}
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0 w-8 h-8 bg-red-50 rounded flex items-center justify-center">
                      <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM8.5 17.5h-1v-5h1.8c1.1 0 1.7.6 1.7 1.5 0 1-.7 1.6-1.8 1.6H8.5v1.9zm0-2.7h.7c.5 0 .8-.3.8-.7s-.3-.7-.8-.7H8.5v1.4zm4.3 2.7h-1v-5h1.1c1.5 0 2.4.9 2.4 2.5s-.9 2.5-2.5 2.5zm0-4.1v3.2c.9 0 1.4-.6 1.4-1.6s-.5-1.6-1.4-1.6zm4.2 4.1v-5h3v.9h-2v1.1h1.8v.9H18v2.1h-1z"/>
                      </svg>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate pr-6">
                        {policy.title}
                      </p>
                      {policy.description && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">
                          {policy.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColor(policy.category)}`}>
                          {policy.category ?? "Other"}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatDate(policy.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* HR delete button */}
                  {isHR && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(policy);
                      }}
                      className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition p-1 rounded hover:bg-red-50"
                      title="Delete policy"
                    >
                      <svg className="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4h6v3M3 7h18" />
                      </svg>
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── RIGHT: PDF Viewer ── */}
        <div className="flex-1 flex flex-col bg-gray-100">
          {!selectedPolicy ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-500">
                Select a policy to view
              </p>
              <p className="text-xs text-gray-400 max-w-xs">
                Click any policy from the list on the left to open and read it here.
              </p>
            </div>
          ) : (
            <>
              {/* Viewer header */}
              <div className="bg-white border-b px-6 py-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">
                    {selectedPolicy.title}
                  </h2>
                  {selectedPolicy.description && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {selectedPolicy.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${categoryColor(selectedPolicy.category)}`}>
                    {selectedPolicy.category ?? "Other"}
                  </span>
                  <button
                    onClick={() => { setSelectedPolicy(null); setPdfUrl(null); }}
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition"
                  >
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* PDF iframe */}
              <div className="flex-1 relative">
                {loadingPdf && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs text-gray-500">Loading document...</p>
                    </div>
                  </div>
                )}
                {pdfUrl && (
                  <iframe
                    ref={iframeRef}
                    src={pdfUrl}
                    className="w-full h-full border-0"
                    title={selectedPolicy.title}
                    // Disabling download via sandbox — allows scripts for PDF.js rendering
                    // but blocks form submission and pointer lock
                    sandbox="allow-scripts allow-same-origin"
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── UPLOAD MODAL (HR only) ── */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold">Upload New Policy</h2>
              <button
                onClick={() => { setShowUploadModal(false); setUploadError(null); }}
                className="p-1 rounded hover:bg-gray-100"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 font-medium">
                  Policy Title <span className="text-red-500">*</span>
                </label>
                <input
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. Annual Leave Policy 2025"
                  className="input mt-1"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 font-medium">
                  Description
                </label>
                <textarea
                  value={uploadDesc}
                  onChange={(e) => setUploadDesc(e.target.value)}
                  placeholder="Brief description (optional)"
                  rows={2}
                  className="input mt-1 resize-none"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 font-medium">
                  Category
                </label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="input mt-1"
                >
                  {CATEGORIES.filter((c) => c !== "All").map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500 font-medium">
                  PDF File <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                  className="mt-1 text-sm text-gray-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                />
                {uploadFile && (
                  <p className="text-xs text-green-600 mt-1">
                    Ready: {uploadFile.name}
                  </p>
                )}
              </div>

              {uploadError && (
                <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">
                  {uploadError}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => { setShowUploadModal(false); setUploadError(null); }}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="px-5 py-2 bg-black text-white text-sm rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
              >
                {uploading ? "Uploading..." : "Upload"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM MODAL (HR only) ── */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-base font-semibold mb-2">Delete Policy?</h2>
            <p className="text-sm text-gray-500 mb-5">
              <span className="font-medium text-gray-800">
                {deleteTarget.title}
              </span>{" "}
              will be permanently removed. This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-5 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyPolicies;