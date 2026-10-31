import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, LayoutDashboard, Loader2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { leaveAdminApi } from "@/api/leave";
import { RequestDetailDialog } from "@/components/leave/RequestDetailDialog";
import { EmptyState, MiniStat, PageTitle, StatusBadge, errorText, fmtDate, fmtDays } from "@/components/leave/leave-ui";

export const Route = createFileRoute("/leave/admin/dashboard")({
  head: () => ({ meta: [{ title: "Leave Dashboard" }] }),
  component: LeaveDashboardPage,
});

function LeaveDashboardPage() {
  const q = useQuery({ queryKey: ["leave-admin", "dashboard"], queryFn: () => leaveAdminApi.dashboard() });
  const [openId, setOpenId] = useState<string | null>(null);
  const d = q.data;
  if (q.isLoading) return <div className="flex justify-center py-16"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>;
  if (q.isError || !d) return <EmptyState title="Could not load dashboard" description={errorText(q.error)} />;

  return (
    <div className="space-y-4">
      <PageTitle icon={<LayoutDashboard className="size-6" />} title={`Leave Dashboard ${d.year}`} subtitle="Requests go directly to Admin and Super Admin for a final decision."
        actions={<Button asChild className="bg-navy text-navy-foreground hover:bg-navy/90"><Link to="/leave/admin/approvals">Open approvals</Link></Button>} />
      {d.stats.employees_without_type > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>{d.stats.employees_without_type} employee(s) have no employee type, so no leave types are mapped to them. <Link className="font-medium underline" to="/leave/admin/employees">Assign employee types</Link></span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <MiniStat label="Total Requests" value={d.stats.total} />
        <MiniStat label="Pending" value={d.stats.pending} tone="pending" />
        <MiniStat label="Approved" value={d.stats.approved} tone="approved" />
        <MiniStat label="Rejected" value={d.stats.rejected} tone="rejected" />
        <MiniStat label="Cancellation Pending" value={d.stats.cancellation_pending} tone="pending" />
        <MiniStat label="On Leave Today" value={d.stats.on_leave_today} tone="info" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="mb-3 text-sm font-semibold">Approved days by leave type</p>
          {d.by_leave_type.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={d.by_leave_type}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="leave_type" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="days" name="Days" radius={[4, 4, 0, 0]}>
                  {d.by_leave_type.map((r) => <Cell key={r.leave_type} fill={r.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState title="No approved leave yet" />}
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="mb-3 text-sm font-semibold">Approved days by month</p>
          {d.by_month.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={d.by_month}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="days" name="Days" fill="var(--navy)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState title="No approved leave yet" />}
        </div>
      </div>
      <div className="rounded-xl border bg-card shadow-sm">
        <p className="border-b px-4 py-3 text-sm font-semibold">Oldest requests waiting for a decision</p>
        {!d.pending.length ? <EmptyState title="All caught up" description="There are no pending requests." /> : (
          <div className="divide-y">
            {d.pending.map((r) => (
              <button key={r.id} onClick={() => setOpenId(r.id)} className="flex w-full flex-wrap items-center justify-between gap-2 px-4 py-3 text-left hover:bg-muted/40">
                <span>
                  <span className="font-medium">{r.employee.name}</span> <span className="text-muted-foreground">({r.employee.employee_type || "no type"})</span>
                  <span className="block text-xs text-muted-foreground">{r.leave_type.name} &middot; {fmtDate(r.from_date)} - {fmtDate(r.to_date)} &middot; {fmtDays(r.days)} day(s) &middot; applied {fmtDate(r.applied_at)}</span>
                </span>
                <StatusBadge status={r.status} />
              </button>
            ))}
          </div>
        )}
      </div>
      <RequestDetailDialog requestId={openId} mode="admin" onClose={() => setOpenId(null)} />
    </div>
  );
}
