import { useState, useEffect } from "react";
import { supabase } from "../Supabase/supabase";
import { useAuth } from "./AuthContext";
import Layout from "../components/layout/Layout";

const WEEKLY_TARGET = 10_000;
const MONTHLY_TARGET = 40_000;

type SaleEntry = {
  id: string;
  amount: number;
  sale_date: string;
  note: string | null;
  created_at: string;
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);

const getWeekBounds = () => {
  const now = new Date();
  const day = now.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(now);
  mon.setDate(now.getDate() + diffToMon);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const iso = (d: Date) => d.toISOString().split("T")[0];
  return { start: iso(mon), end: iso(sun) };
};

const getMonthBounds = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: `${y}-${m}-01`,
    end: `${y}-${m}-${String(last.getDate()).padStart(2, "0")}`,
  };
};

const ProgressRing = ({ pct, size = 80 }: { pct: number; size?: number }) => {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const filled = (Math.min(100, pct) / 100) * circ;
  const color = pct >= 100 ? "#16a34a" : pct >= 50 ? "#C6A15B" : "#f87171";

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={8} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={`${filled} ${circ}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
    </svg>
  );
};

const LogSale = () => {
  const { user } = useAuth();

  const [amount, setAmount] = useState("");
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [sales, setSales] = useState<SaleEntry[]>([]);
  const [weeklySales, setWeeklySales] = useState(0);
  const [monthlySales, setMonthlySales] = useState(0);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchSales = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("employee_sales")
      .select("*")
      .eq("user_id", user.id)
      .order("sale_date", { ascending: false })
      .order("created_at", { ascending: false });

    const entries = (data || []) as SaleEntry[];
    setSales(entries);

    const week = getWeekBounds();
    const month = getMonthBounds();

    setWeeklySales(
      entries
        .filter((e) => e.sale_date >= week.start && e.sale_date <= week.end)
        .reduce((s, e) => s + e.amount, 0)
    );
    setMonthlySales(
      entries
        .filter((e) => e.sale_date >= month.start && e.sale_date <= month.end)
        .reduce((s, e) => s + e.amount, 0)
    );
  };

  useEffect(() => {
    fetchSales();
  }, [user]);

  const handleSubmit = async () => {
    const val = Number(amount);
    if (!val || val <= 0 || !user) return;
    setSubmitting(true);

    const { error } = await supabase.from("employee_sales").insert([{
      user_id: user.id,
      amount: val,
      sale_date: saleDate,
      note: note.trim() || null,
    }]);

    if (!error) {
      setAmount("");
      setNote("");
      setSaleDate(new Date().toISOString().split("T")[0]);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      await fetchSales();
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    await supabase.from("employee_sales").delete().eq("id", id);
    await fetchSales();
    setDeleting(null);
  };

  const weeklyPct = (weeklySales / WEEKLY_TARGET) * 100;
  const monthlyPct = (monthlySales / MONTHLY_TARGET) * 100;

  const week = getWeekBounds();
  const month = getMonthBounds();

  const thisWeekSales = sales.filter(
    (e) => e.sale_date >= week.start && e.sale_date <= week.end
  );
  const thisMonthSales = sales.filter(
    (e) => e.sale_date >= month.start && e.sale_date <= month.end
  );

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Page header */}
        <div>
          <h1 className="text-2xl font-black text-[#0B3D2E]">Log a Sale</h1>
          <p className="text-sm text-gray-500 mt-0.5">Record your closed deals and track progress toward your targets</p>
        </div>

        {/* Target progress cards */}
        <div className="grid grid-cols-2 gap-4">
          {/* Weekly */}
          <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <ProgressRing pct={weeklyPct} size={72} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-gray-700">{Math.round(weeklyPct)}%</span>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Weekly</p>
              <p className="text-lg font-black text-gray-900">{fmt(weeklySales)}</p>
              <p className="text-xs text-gray-400">
                {weeklyPct >= 100
                  ? <span className="text-green-600 font-semibold">✓ Target hit!</span>
                  : <>{fmt(Math.max(0, WEEKLY_TARGET - weeklySales))} left</>}
              </p>
            </div>
          </div>

          {/* Monthly */}
          <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <ProgressRing pct={monthlyPct} size={72} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-gray-700">{Math.round(monthlyPct)}%</span>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Monthly</p>
              <p className="text-lg font-black text-gray-900">{fmt(monthlySales)}</p>
              <p className="text-xs text-gray-400">
                {monthlyPct >= 100
                  ? <span className="text-green-600 font-semibold">✓ Target hit!</span>
                  : <>{fmt(Math.max(0, MONTHLY_TARGET - monthlySales))} left</>}
              </p>
            </div>
          </div>
        </div>

        {/* Log sale form */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#0B3D2E]">New Sale Entry</h2>
            <div className="w-2 h-2 rounded-full bg-[#C6A15B]" />
          </div>

          <div className="p-5 space-y-4">
            {/* Amount */}
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1.5">Sale Amount</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">$</span>
                <input
                  type="number"
                  placeholder="0"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  className="pl-8 pr-4 py-3 border border-gray-200 rounded-xl w-full text-lg font-bold focus:outline-none focus:ring-2 focus:ring-[#C6A15B] placeholder:font-normal placeholder:text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Date */}
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1.5">Sale Date</label>
                <input
                  type="date"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  className="px-3 py-2.5 border border-gray-200 rounded-xl w-full text-sm focus:outline-none focus:ring-2 focus:ring-[#C6A15B]"
                />
              </div>

              {/* Note */}
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1.5">Note (optional)</label>
                <input
                  type="text"
                  placeholder="Client name, deal type…"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  className="px-3 py-2.5 border border-gray-200 rounded-xl w-full text-sm focus:outline-none focus:ring-2 focus:ring-[#C6A15B]"
                />
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting || !amount}
              className="w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-40 bg-[#0B3D2E] text-white hover:bg-[#0d4c38] hover:shadow-md active:scale-[0.98]"
            >
              {submitting ? "Logging…" : success ? "✓ Sale Logged!" : "Log Sale"}
            </button>

            {success && (
              <p className="text-center text-sm text-green-600 font-medium animate-pulse">
                Sale recorded successfully!
              </p>
            )}
          </div>
        </div>

        {/* This week's entries */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#0B3D2E]">This Week</h2>
            <span className="text-xs text-gray-400 font-medium">{fmt(weeklySales)} / {fmt(WEEKLY_TARGET)}</span>
          </div>

          {thisWeekSales.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No sales logged this week yet</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {thisWeekSales.map((e) => (
                <div key={e.id} className="flex items-center justify-between px-5 py-3 group hover:bg-gray-50/60 transition">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{fmt(e.amount)}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(e.sale_date + "T00:00:00").toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
                      {e.note && <> · <span className="italic">{e.note}</span></>}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(e.id)}
                    disabled={deleting === e.id}
                    className="opacity-0 group-hover:opacity-100 transition p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* This month's entries */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#0B3D2E]">
              {new Date().toLocaleString("default", { month: "long" })} — All Entries
            </h2>
            <span className="text-xs text-gray-400 font-medium">{fmt(monthlySales)} / {fmt(MONTHLY_TARGET)}</span>
          </div>

          {thisMonthSales.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No sales logged this month yet</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {thisMonthSales.map((e) => (
                <div key={e.id} className="flex items-center justify-between px-5 py-3 group hover:bg-gray-50/60 transition">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{fmt(e.amount)}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(e.sale_date + "T00:00:00").toLocaleDateString([], { month: "short", day: "numeric" })}
                      {e.note && <> · <span className="italic">{e.note}</span></>}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(e.id)}
                    disabled={deleting === e.id}
                    className="opacity-0 group-hover:opacity-100 transition p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
};

export default LogSale;
