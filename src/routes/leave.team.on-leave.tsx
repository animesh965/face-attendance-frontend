import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { leaveApi } from "@/api/leave";
import { FilterSelect } from "@/components/leave/FilterSelect";
import { RequestDetailDialog } from "@/components/leave/RequestDetailDialog";
import { useFilterOptions } from "@/components/leave/useFilterOptions";
import { EmptyState, StatusBadge, errorText, fmtDate, fmtDays, isoDay } from "@/components/leave/leave-ui";

export const Route = createFileRoute("/leave/team/on-leave")({
  head: () => ({ meta: [{ title: "On Leave" }] }),
  component: OnLeavePage,
});

function OnLeavePage() {
  const today = isoDay(new Date());
  const [filters, setFilters] = useState<{ from_date: string; to_date: string; employee_id?: string | undefined; department_id?: string | undefined; employee_type_id?: string | undefined; leave_type_id?: string | undefined }>({ from_date: today, to_date: today });
  const [openId, setOpenId] = useState<string | null>(null);
  const opts = useFilterOptions();
  const q = useQuery({ queryKey: ["leave", "on-leave", filters], queryFn: () => leaveApi.onLeave(filters), enabled: filters.from_date <= filters.to_date });
  const set = (patch: Partial<typeof filters>) => setFilters((f) => ({ ...f, ...patch }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4 shadow-sm">
        <div className="space-y-1"><Label className="text-xs text-muted-foreground">From</Label><Input type="date" value={filters.from_date} onChange={(e) => set({ from_date: e.target.value || today })} className="w-40" /></div>
        <div className="space-y-1"><Label className="text-xs text-muted-foreground">To</Label><Input type="date" value={filters.to_date} min={filters.from_date} onChange={(e) => set({ to_date: e.target.value || filters.from_date })} className="w-40" /></div>
        <FilterSelect label="Employee" value={filters.employee_id} onChange={(v) => set({ employee_id: v })} options={opts.employees} allLabel="All employees" className="w-56" />
        <FilterSelect label="Department" value={filters.department_id} onChange={(v) => set({ department_id: v })} options={opts.departments} allLabel="All departments" />
        <FilterSelect label="Employee type" value={filters.employee_type_id} onChange={(v) => set({ employee_type_id: v })} options={opts.employeeTypes} allLabel="All employee types" />
        <FilterSelect label="Leave type" value={filters.leave_type_id} onChange={(v) => set({ leave_type_id: v })} options={opts.leaveTypes} allLabel="All leave types" />
      </div>
      <div className="rounded-xl border bg-card shadow-sm">
        <p className="border-b px-4 py-3 text-sm font-semibold">
          On leave {filters.from_date === filters.to_date ? `on ${fmtDate(filters.from_date)}` : `from ${fmtDate(filters.from_date)} to ${fmtDate(filters.to_date)}`}
          {q.data && <span className="ml-2 font-normal text-muted-foreground">({q.data.items.length})</span>}
        </p>
        {q.isLoading ? <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
          : q.isError ? <EmptyState title="Could not load" description={errorText(q.error)} />
          : !q.data?.items.length ? <EmptyState title="Nobody is on leave" description="No approved leave falls in this period." />
          : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Employee</TableHead><TableHead>Employee Type</TableHead><TableHead>Department</TableHead><TableHead>Leave Type</TableHead><TableHead>From</TableHead><TableHead>To</TableHead><TableHead>Days</TableHead><TableHead>Status</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {q.data.items.map((r) => (
                    <TableRow key={r.id} className="cursor-pointer" onClick={() => setOpenId(r.id)}>
                      <TableCell className="font-medium">{r.employee.employee_id ? `${r.employee.employee_id} - ` : ""}{r.employee.name}</TableCell>
                      <TableCell>{r.employee.employee_type || "-"}</TableCell>
                      <TableCell>{r.employee.department || "-"}</TableCell>
                      <TableCell><span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ backgroundColor: r.leave_type.color }} />{r.leave_type.name}</span></TableCell>
                      <TableCell>{fmtDate(r.from_date)}</TableCell>
                      <TableCell>{fmtDate(r.to_date)}</TableCell>
                      <TableCell>{fmtDays(r.days)}{r.half_day ? " (½)" : ""}</TableCell>
                      <TableCell><StatusBadge status={r.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
      </div>
      <RequestDetailDialog requestId={openId} mode={opts.isAdmin ? "admin" : "team"} onClose={() => setOpenId(null)} />
    </div>
  );
}
