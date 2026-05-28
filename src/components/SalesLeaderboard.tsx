import { useState, useEffect } from "react";
import { supabase } from "../Supabase/supabase";
import { useAuth } from "../pages/AuthContext";

const WEEKLY_TARGET = 10_000;
const MONTHLY_TARGET = 40_000;

type EmployeeRow = {
  id: string;
  name: string;
  designation: string | null;
  weeklySales: number;
  monthlySales: number;
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

type Props = { onClose: () => void };

const SalesLeaderboard = ({ onClose }: Props) => {
  const { user } = useAuth();
  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [myWeeklySales, setMyWeeklySales] = useState(0);
  const [myMonthlySales, setMyMonthlySales] = useState(0);

  const fetchData = async () => {
    // Employees, managers, and CEOs
    const { data: employees } = await supabase
      .from("users")
      .select("id, name, designation")
      .in("role", ["employee", "manager", "ceo"]);

    if (!employees) { setLoading(false); return; }

    const { data: salesData } = await supabase
      .from("employee_sales")
      .select("user_id, amount, sale_date");

    const week = getWeekBounds();
    const month = getMonthBounds();

    const ranked: EmployeeRow[] = employees.map((emp) => {
      const empSales = (salesData || []).filter((s) => s.user_id === emp.id);
      const weeklySales = empSales
        .filter((s) => s.sale_date >= week.start && s.sale_date <= week.end)
        .reduce((sum, s) => sum + Number(s.amount), 0);
      const monthlySales = empSales
        .filter((s) => s.sale_date >= month.start && s.sale_date <= month.end)
        .reduce((sum, s) => sum + Number(s.amount), 0);
      return { id: emp.id, name: emp.name, designation: emp.designation ?? null, weeklySales, monthlySales };
    });

    ranked.sort((a, b) => b.monthlySales - a.monthlySales);
    setRows(ranked);

    // Pull current user's own numbers
    const me = ranked.find((r) => r.id === user?.id);
    if (me) {
      setMyWeeklySales(me.weeklySales);
      setMyMonthlySales(me.monthlySales);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const weeklyRemaining = Math.max(0, WEEKLY_TARGET - myWeeklySales);
  const monthlyRemaining = Math.max(0, MONTHLY_TARGET - myMonthlySales);
  const weeklyPct = Math.min(100, (myWeeklySales / WEEKLY_TARGET) * 100);
  const monthlyPct = Math.min(100, (myMonthlySales / MONTHLY_TARGET) * 100);

  // Top/bottom logic based on employees who have actually sold something
  const activeSellers = rows.filter((r) => r.monthlySales > 0);
  const topId = activeSellers[0]?.id ?? null;
  const bottomId = activeSellers.length > 1 ? activeSellers[activeSellers.length - 1]?.id ?? null : null;

  const monthName = new Date().toLocaleString("default", { month: "long" });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-3xl w-[92vw] max-w-lg max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >

        {/* ── Grand Header ── */}
        <div className="relative bg-gradient-to-br from-[#0B3D2E] via-[#0f4f3a] to-[#1a6b50] px-6 pt-6 pb-5 flex-shrink-0 overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5" />
          <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/5" />

          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition text-white/70 hover:text-white"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Trophy + title */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg flex-shrink-0">
              <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
                <path d="M15 3L18.5 11.5H27.5L20.5 16.5L23 25L15 20L7 25L9.5 16.5L2.5 11.5H11.5L15 3Z" fill="white" />
              </svg>
            </div>
            <div>
              <p className="text-[11px] text-amber-300/80 font-semibold uppercase tracking-widest">
                {monthName} Competition
              </p>
              <h2 className="text-2xl font-black text-white leading-tight">
                Sales Leaderboard
              </h2>
              <p className="text-xs text-white/50 mt-0.5">
                {rows.length} employee{rows.length !== 1 ? "s" : ""} ranked by monthly sales
              </p>
            </div>
          </div>
        </div>

        {/* ── Your Targets (current user only) ── */}
        <div className="px-6 py-4 bg-amber-50/60 border-b border-amber-100 flex-shrink-0">
          <p className="text-[11px] font-bold text-amber-700 uppercase tracking-widest mb-3">
            Your Remaining Targets
          </p>
          <div className="space-y-3">
            {/* Weekly */}
            <div>
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-xs font-medium text-gray-600">Weekly</span>
                <span className="text-xs font-bold text-gray-800">
                  {weeklyRemaining === 0
                    ? <span className="text-green-600">✓ Target Hit!</span>
                    : <>{fmt(weeklyRemaining)} <span className="text-gray-400 font-normal">/ {fmt(WEEKLY_TARGET)}</span></>
                  }
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-2 rounded-full transition-all duration-700"
                  style={{
                    width: `${weeklyPct}%`,
                    background: weeklyPct >= 100
                      ? "linear-gradient(90deg, #16a34a, #22c55e)"
                      : weeklyPct >= 50
                      ? "linear-gradient(90deg, #C6A15B, #E8C06A)"
                      : "linear-gradient(90deg, #f87171, #fca5a5)",
                  }}
                />
              </div>
            </div>
            {/* Monthly */}
            <div>
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-xs font-medium text-gray-600">Monthly</span>
                <span className="text-xs font-bold text-gray-800">
                  {monthlyRemaining === 0
                    ? <span className="text-green-600">✓ Target Hit!</span>
                    : <>{fmt(monthlyRemaining)} <span className="text-gray-400 font-normal">/ {fmt(MONTHLY_TARGET)}</span></>
                  }
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-2 rounded-full transition-all duration-700"
                  style={{
                    width: `${monthlyPct}%`,
                    background: monthlyPct >= 100
                      ? "linear-gradient(90deg, #16a34a, #22c55e)"
                      : monthlyPct >= 50
                      ? "linear-gradient(90deg, #C6A15B, #E8C06A)"
                      : "linear-gradient(90deg, #f87171, #fca5a5)",
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Rankings ── */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-3 border-[#C6A15B] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <span className="text-5xl mb-3">🏅</span>
              <p className="text-gray-500 font-medium">No employees found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {rows.map((emp, idx) => {
                const isTop = emp.id === topId;
                const isBottom = emp.id === bottomId;
                const isMe = emp.id === user?.id;
                const monthlyPctRow = Math.min(100, (emp.monthlySales / MONTHLY_TARGET) * 100);

                // Row styles
                let rowBg = "bg-white hover:bg-gray-50/80";
                if (isTop) rowBg = "bg-gradient-to-r from-amber-100 via-yellow-50 to-amber-50";
                else if (isBottom) rowBg = "bg-red-50/70";

                const rankDisplay =
                  idx === 0 ? "👑" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`;

                return (
                  <div
                    key={emp.id}
                    className={`flex items-center gap-4 px-6 py-4 transition-colors ${rowBg}`}
                  >
                    {/* Rank */}
                    <div className={`w-10 text-center flex-shrink-0 ${
                      isTop ? "text-2xl" : isBottom ? "text-sm text-red-400 font-bold" : "text-sm text-gray-400 font-bold"
                    }`}>
                      {rankDisplay}
                    </div>

                    {/* Name + bar */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`font-semibold truncate ${
                          isTop ? "text-amber-900 text-base" : isBottom ? "text-red-700 text-sm" : "text-gray-800 text-sm"
                        }`}>
                          {emp.name}
                        </p>
                        {isTop && (
                          <span className="flex-shrink-0 text-[10px] font-black text-amber-700 bg-amber-200 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                            Champion
                          </span>
                        )}
                        {isMe && (
                          <span className="flex-shrink-0 text-[10px] font-medium text-[#0B3D2E] bg-emerald-100 px-1.5 py-0.5 rounded-full">
                            you
                          </span>
                        )}
                      </div>
                      {emp.designation && (
                        <p className="text-[11px] text-gray-400 truncate">{emp.designation}</p>
                      )}
                      {/* Mini progress bar */}
                      <div className="mt-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden w-full">
                        <div
                          className="h-1.5 rounded-full"
                          style={{
                            width: `${monthlyPctRow}%`,
                            background: isTop
                              ? "linear-gradient(90deg, #C6A15B, #F0D070)"
                              : isBottom
                              ? "linear-gradient(90deg, #f87171, #fca5a5)"
                              : "linear-gradient(90deg, #6b7280, #9ca3af)",
                          }}
                        />
                      </div>
                    </div>

                    {/* Sales amount */}
                    <div className="text-right flex-shrink-0">
                      <p className={`font-black ${
                        isTop ? "text-amber-700 text-lg" : isBottom ? "text-red-500 text-sm" : "text-gray-700 text-sm"
                      }`}>
                        {fmt(emp.monthlySales)}
                      </p>
                      <p className="text-[10px] text-gray-400">this month</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex-shrink-0 text-center">
          <p className="text-[11px] text-gray-400">
            Log your sales from the <span className="font-semibold text-[#0B3D2E]">Log Sale</span> page in the sidebar
          </p>
        </div>
      </div>
    </div>
  );
};

export default SalesLeaderboard;
