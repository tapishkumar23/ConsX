import { useEffect, useRef, useState } from "react";
import { supabase } from "../Supabase/supabase";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../pages/AuthContext";

interface Policy {
  id: string;
  title: string;
  description: string | null;
  file_path: string;
  created_at: string;
  uploaded_by: string | null;
}

const CompanyPolicies = () => {
  const navigate = useNavigate();
  const { user, role } = useAuth();

  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);

  // HR upload state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDesc, setUploadDesc] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Policy | null>(null);
  const [deleting, setDeleting] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const isHR = role === "hr";

  /* fetch policies */
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

  /* open policy viewer */
  const handleOpenPolicy = async (policy: Policy) => {
    setSelectedPolicy(policy);
    setPdfUrl(null);
    setLoadingPdf(true);

    const { data, error } = await supabase.storage
      .from("company-policies")
      .createSignedUrl(policy.file_path, 60 * 60);

    if (error) {
      console.error(error.message);
      setLoadingPdf(false);
      return;
    }

    setPdfUrl((data?.signedUrl ?? "") + "#toolbar=0&navpanes=0&scrollbar=1");
    setLoadingPdf(false);
  };

  /* upload policy (HR) */
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
    await fetchPolicies();
    setUploading(false);
  };

  /* delete policy (HR) */
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

  /* format date */
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  return (
    <div className="min-h-screen w-full bg-gray-50 font-sans">
      {/* HEADER */}
      <div className="bg-white border-b px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
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

      <div className="flex flex-col lg:flex-row h-screen w-full">

        {/* LEFT: Policy Index */}
        <div
          className={`w-full lg:w-72 border-b lg:border-r bg-white flex flex-col flex-shrink-0 
          max-h-[45vh] sm:max-h-[50vh] lg:max-h-none
          ${selectedPolicy ? "hidden lg:flex" : "flex"}`}
        >
          <div className="px-4 py-3 border-b">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              All Policies
            </p>
          </div>

          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-6 text-sm text-gray-400">Loading...</div>
            ) : policies.length === 0 ? (
              <div className="p-6 text-sm text-gray-400 text-center">
                No policies uploaded yet.
              </div>
            ) : (
              policies.map((policy, index) => (
                <div
                  key={policy.id}
                  onClick={() => handleOpenPolicy(policy)}
                  className={`group relative flex items-start gap-3 px-3 sm:px-4 py-3 border-b cursor-pointer transition border-l-2 ${
                    selectedPolicy?.id === policy.id
                      ? "bg-gray-50 border-l-black"
                      : "border-l-transparent hover:bg-gray-50"
                  }`}
                >
                  {/* Index number */}
                  <span className="text-xs text-gray-400 font-mono mt-0.5 w-5 flex-shrink-0">
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  {/* PDF icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM8.5 17.5h-1v-5h1.8c1.1 0 1.7.6 1.7 1.5 0 1-.7 1.6-1.8 1.6H8.5v1.9zm0-2.7h.7c.5 0 .8-.3.8-.7s-.3-.7-.8-.7H8.5v1.4zm4.3 2.7h-1v-5h1.1c1.5 0 2.4.9 2.4 2.5s-.9 2.5-2.5 2.5zm0-4.1v3.2c.9 0 1.4-.6 1.4-1.6s-.5-1.6-1.4-1.6zm4.2 4.1v-5h3v.9h-2v1.1h1.8v.9H18v2.1h-1z"/>
                    </svg>
                  </div>

                  {/* Title + date */}
                  <div className="flex-1 min-w-0 pr-5">
                    <p className={`text-sm font-medium truncate ${
                      selectedPolicy?.id === policy.id ? "text-gray-900" : "text-gray-700"
                    }`}>
                      {policy.title}
                    </p>
                    {policy.description && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {policy.description}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDate(policy.created_at)}
                    </p>
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

        {/* RIGHT: PDF Viewer */}
        <div className="flex-1 flex flex-col bg-gray-100 w-full h-full">
          {!selectedPolicy ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-500">Select a policy to view</p>
              <p className="text-xs text-gray-400 max-w-xs">
                Click any policy from the list on the left to open and read it here.
              </p>
            </div>
          ) : (
            <>
              {/* Viewer header */}
              <div className="bg-white border-b px-4 sm:px-6 py-3 flex items-center justify-between">
                {selectedPolicy && (
                  <button
                    onClick={() => { setSelectedPolicy(null); setPdfUrl(null); }}
                    className="lg:hidden text-xs text-blue-500 mr-2"
                  >
                    ← Back
                  </button>
                )}
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
                <button
                  onClick={() => { setSelectedPolicy(null); setPdfUrl(null); }}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition"
                >
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* PDF viewer with right-click block */}
              <div
                className="flex-1 relative select-none h-[calc(100vh-120px)] lg:h-full"
                onContextMenu={(e) => e.preventDefault()}
              >
                {loadingPdf && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-20">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs text-gray-500">Loading document...</p>
                    </div>
                  </div>
                )}

                {pdfUrl && (
                  <>
                    <iframe
                      ref={iframeRef}
                      src={pdfUrl}
                      className="w-full h-full border-0"
                      title={selectedPolicy.title}
                    />
                    {/*
                      Transparent overlay sits on top of the iframe.
                      It has pointer-events: none so scrolling/clicking inside
                      the PDF still works, but the browser's native right-click
                      menu is caught by the parent's onContextMenu handler.
                      For extra coverage we also handle it directly here.
                    */}
                    <div
                      className="absolute inset-0 z-10"
                      style={{ pointerEvents: "none" }}
                      onContextMenu={(e) => e.preventDefault()}
                    />
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* UPLOAD MODAL (HR only) */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-2 sm:mx-auto p-5 sm:p-6">
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

      {/* DELETE CONFIRM MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-2 sm:mx-auto p-5 sm:p-6">
            <h2 className="text-base font-semibold mb-2">Delete Policy?</h2>
            <p className="text-sm text-gray-500 mb-5">
              <span className="font-medium text-gray-800">{deleteTarget.title}</span>{" "}
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
