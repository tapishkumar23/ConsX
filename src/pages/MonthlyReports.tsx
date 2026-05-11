import { useEffect, useState } from "react";
import { supabase } from "../Supabase/supabase";
import Layout from "../components/layout/Layout";

interface Report {
  id: string;
  user_id: string;
  user_name: string;
  role: string;
  month: string;
  report_title: string;
  report_url: string;
  created_at: string;
}

export default function MonthlyReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [month, setMonth] = useState("");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchReports();
    }
  }, [currentUser]);

  async function fetchCurrentUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    setCurrentUser(data);
  }

  async function fetchReports() {
    const { data } = await supabase
      .from("monthly_reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (!data) return;

    let filtered = data;

    if (currentUser.role === "employee") {
      filtered = data.filter(
        (r) => r.user_id === currentUser.id
      );
    }

    if (currentUser.role === "manager") {
      filtered = data.filter(
        (r) =>
          r.user_id === currentUser.id ||
          r.role === "employee"
      );
    }

    if (currentUser.role === "hr") {
      filtered = data.filter(
        (r) =>
          r.role === "employee" ||
          r.role === "manager" ||
          r.user_id === currentUser.id
      );
    }

    setReports(filtered);
  }

  async function uploadReport() {
    if (!file || !month || !title) {
      alert("Fill all fields");
      return;
    }

    const filePath = `${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("monthly-reports")
      .upload(filePath, file);

    if (uploadError) {
      console.log(uploadError);
      alert("Upload failed");
      return;
    }

    const { data } = supabase.storage
      .from("monthly-reports")
      .getPublicUrl(filePath);

    const reportUrl = data.publicUrl;

    const { error } = await supabase
      .from("monthly_reports")
      .insert({
        user_id: currentUser.id,
        user_name: currentUser.name,
        role: currentUser.role,
        month,
        report_title: title,
        report_url: reportUrl,
      });

    if (error) {
      console.log(error);
      alert("Save failed");
      return;
    }

    alert("Report uploaded");

    setMonth("");
    setTitle("");
    setFile(null);

    fetchReports();
  }

  return (
    <Layout>
      <div className="space-y-6">

        <div>
          <h1 className="text-3xl font-bold">
            Monthly Reports
          </h1>
          <p className="text-gray-500 mt-1">
            Upload and manage monthly reports
          </p>
        </div>

        {currentUser?.role !== "ceo" && (
          <div className="bg-white rounded-xl p-6 shadow-sm border space-y-4">

            <h2 className="text-xl font-semibold">
              Upload Report
            </h2>

            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full border rounded-lg p-3"
            />

            <input
              type="text"
              placeholder="Report Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border rounded-lg p-3"
            />

            <input
              type="file"
              onChange={(e) =>
                setFile(e.target.files?.[0] || null)
              }
              className="w-full"
            />

            <button
              onClick={uploadReport}
              className="bg-black text-white px-6 py-3 rounded-lg"
            >
              Upload Report
            </button>
          </div>
        )}

        <div className="bg-white rounded-xl p-6 shadow-sm border">

          <h2 className="text-xl font-semibold mb-4">
            Submitted Reports
          </h2>

          <div className="space-y-4">

            {reports.map((report) => (
              <div
                key={report.id}
                className="border rounded-lg p-4 flex justify-between items-center"
              >
                <div>
                  <p className="font-semibold">
                    {report.report_title}
                  </p>

                  <p className="text-sm text-gray-500">
                    {report.user_name} • {report.role}
                  </p>

                  <p className="text-sm text-gray-500">
                    {report.month}
                  </p>
                </div>

                <a
                  href={report.report_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-black text-white px-4 py-2 rounded-lg"
                >
                  View Report
                </a>
              </div>
            ))}

          </div>
        </div>

      </div>
    </Layout>
  );
}