import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { addMonths, addWeeks, format } from "date-fns";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { leaveApi } from "@/api/leave";
import { FilterSelect } from "@/components/leave/FilterSelect";
import { LeaveMonthCalendar, calendarRange } from "@/components/leave/LeaveMonthCalendar";
import { RequestDetailDialog } from "@/components/leave/RequestDetailDialog";
import { useFilterOptions } from "@/components/leave/useFilterOptions";
import { EmptyState, StatusBadge, errorText, fmtDate, fmtDays, isoDay } from "@/components/leave/leave-ui";
import { useAppStore } from "@/store/useAppStore";

export const Route = createFileRoute("/leave/calendar")({
  head: () => ({ meta: [{ title: "Leave Calendar" }] }),
  component: LeaveCalendarPage,
});

type View = "month" | "week" | "list";

function LeaveCalendarPage() {
  const [view, setView] = useState<View>("month");
  const [anchor, setAnchor] = useState(new Date());
  const [filters, setFilters] = useState<{ employee_id?: string | undefined; department_id?: string | undefined; employee_type_id?: string | undefined; leave_type_id?: string | undefined }>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const opts = useFilterOptions();
  const me = useAppStore((s) => s.user?.id);
  const range = calendarRange(anchor, view === "week" ? "week" : "month");
  const params = { from_date: isoDay(range.start), to_date: isoDay(range.end), ...filters };
  const q = useQuery({ queryKey: ["leave", "calendar", params], queryFn: () => leaveApi.calendar(params), placeholderData: (p) => p });
  const step = (dir: number) => setAnchor((a) => (view === "week" ? addWeeks(a, dir) : addMonths(a, dir)));
  const label = view === "week" ? `${format(range.start, "dd MMM")} - ${format(range.end, "dd MMM yyyy")}` : format(anchor, "MMMM yyyy");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4 shadow-sm">
        {(opts.isAdmin || opts.employees.length > 0) && (
          <FilterSelect label="Employee" value={filters.employee_id} onChange={(v) => setFilters((f) => ({ ...f, employee_id: v }))}
            options={opts.isAdmin ? opts.employees : [...(me ? [{ id: me, name: "Me" }] : []), ...opts.employees]} allLabel="All employees" className="w-56" />
        )}
        {opts.isAdmin && <FilterSelect label="Department" value={filters.department_id} onChange={(v) => setFilters((f) => ({ ...f, department_id: v }))} options={opts.departments} allLabel="All departments" />}
        {opts.isAdmin && <FilterSelect label="Employee type" value={filters.employee_type_id} onChange={(v) => setFilters((f) => ({ ...f, employee_type_id: v }))} options={opts.employeeTypes} allLabel="All employee types" />}
        <FilterSelect label="Leave type" value={filters.leave_type_id} onChange={(v) => setFilters((f) => ({ ...f, leave_type_id: v }))} options={opts.leaveTypes} allLabel="All leave types" />
      </div>
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => step(-1)} aria-label="Previous"><ChevronLeft className="size-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => setAnchor(new Date())}>Today</Button>
            <Button variant="ghost" size="icon" onClick={() => step(1)} aria-label="Next"><ChevronRight className="size-4" /></Button>
            <span className="ml-2 text-sm font-semibold">{label}</span>
            {q.isFetching && <Loader2 className="ml-2 size-4 animate-spin text-muted-foreground" />}
          </div>
          <div className="flex rounded-md border p-0.5 text-sm">
            {(["month", "week", "list"] as View[]).map((v) => (
              <button key={v} onClick={() => setView(v)} className={cn("rounded px-3 py-1 capitalize", view === v ? "bg-navy text-navy-foreground" : "text-muted-foreground")}>{v}</button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-4 border-b px-4 py-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-sky-500" /> Approved leave (leave type colour)</span>
          <span className="flex items-center gap-1.5"><span className="size-3 rounded border border-dashed border-sky-500 bg-sky-500/60" /> Pending</span>
          <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-violet-200" /> Holiday</span>
          <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-muted" /> Weekly off</span>
        </div>
        {q.isError ? <EmptyState title="Could not load calendar" description={errorText(q.error)} />
          : !q.data ? <div className="flex justify-center py-16"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
          : view === "list" ? (
            !q.data.leaves.length && !q.data.holidays.length ? <EmptyState /> : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Event</TableHead><TableHead>Employee</TableHead><TableHead>Days</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {[...q.data.holidays.map((h) => ({ key: h.id, date: h.from_date, node: (
                      <TableRow key={h.id}>
                        <TableCell>{fmtDate(h.from_date)}{h.to_date !== h.from_date ? ` - ${fmtDate(h.to_date)}` : ""}</TableCell>
                        <TableCell className="text-violet-700 dark:text-violet-300">{h.name} (Holiday)</TableCell><TableCell>-</TableCell><TableCell>{h.days}</TableCell><TableCell>-</TableCell>
                      </TableRow>) })),
                    ...q.data.leaves.map((l) => ({ key: l.id, date: l.from_date, node: (
                      <TableRow key={l.id} className="cursor-pointer" onClick={() => setOpenId(l.id)}>
                        <TableCell>{fmtDate(l.from_date)}{l.to_date !== l.from_date ? ` - ${fmtDate(l.to_date)}` : ""}</TableCell>
                        <TableCell><span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ backgroundColor: l.leave_type.color }} />{l.leave_type.name}</span></TableCell>
                        <TableCell>{l.employee.name}</TableCell><TableCell>{fmtDays(l.days)}</TableCell><TableCell><StatusBadge status={l.status} /></TableCell>
                      </TableRow>) }))].sort((a, b) => a.date.localeCompare(b.date)).map((r) => r.node)}
                  </TableBody>
                </Table>
              </div>
            )
          ) : (
            <LeaveMonthCalendar anchor={anchor} view={view} leaves={q.data.leaves} holidays={q.data.holidays} weeklyOffs={q.data.weekly_offs} onSelectLeave={(l) => setOpenId(l.id)} showEmployee />
          )}
      </div>
      <RequestDetailDialog requestId={openId} mode={opts.isAdmin ? "admin" : "self"} onClose={() => setOpenId(null)} />
    </div>
  );
}
