import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Info, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { leaveApi, type RequestFilters } from "@/api/leave";
import { RequestDetailDialog } from "@/components/leave/RequestDetailDialog";
import { RequestFilterPanel } from "@/components/leave/request-filters";
import { useFilterOptions } from "@/components/leave/useFilterOptions";
import { EmptyState, Pager, StatusBadge, errorText, fmtDate, fmtDays } from "@/components/leave/leave-ui";

export const Route = createFileRoute("/leave/team/requests")({
  head: () => ({ meta: [{ title: "Team Leave Requests" }] }),
  component: TeamRequestsPage,
});

function TeamRequestsPage() {
  const [filters, setFilters] = useState<RequestFilters>({ page: 1, page_size: 20 });
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const opts = useFilterOptions();
  const q = useQuery({ queryKey: ["leave", "team-requests", filters], queryFn: () => leaveApi.teamRequests(filters), placeholderData: (p) => p });

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200">
        <Info className="mt-0.5 size-4 shrink-0" />
        Leave requests of your reportees are shown for information. Approvals are handled centrally by Admin and Super Admin.
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <form className="relative" onSubmit={(e) => { e.preventDefault(); setFilters((f) => ({ ...f, search: search.trim() || undefined, page: 1 })); }}>
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employee name or ID" className="w-64 pl-8" />
        </form>
        <RequestFilterPanel filters={filters} onApply={setFilters} leaveTypes={opts.leaveTypes} />
      </div>
      <div className="rounded-xl border bg-card shadow-sm">
        {q.isLoading ? <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
          : q.isError ? <EmptyState title="Could not load" description={errorText(q.error)} />
          : !q.data?.items.length ? <EmptyState />
          : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Request</TableHead><TableHead>Employee</TableHead><TableHead>Leave Type</TableHead><TableHead>From</TableHead><TableHead>To</TableHead><TableHead>Days</TableHead><TableHead>Applied</TableHead><TableHead>Status</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {q.data.items.map((r) => (
                      <TableRow key={r.id} className="cursor-pointer" onClick={() => setOpenId(r.id)}>
                        <TableCell className="font-medium text-navy">{r.request_no}</TableCell>
                        <TableCell>{r.employee.employee_id ? `${r.employee.employee_id} - ` : ""}{r.employee.name}</TableCell>
                        <TableCell>{r.leave_type.name}</TableCell>
                        <TableCell>{fmtDate(r.from_date)}</TableCell>
                        <TableCell>{fmtDate(r.to_date)}</TableCell>
                        <TableCell>{fmtDays(r.days)}</TableCell>
                        <TableCell>{fmtDate(r.applied_at)}</TableCell>
                        <TableCell><StatusBadge status={r.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Pager page={q.data.page} pageSize={q.data.page_size} total={q.data.total} onPage={(p) => setFilters((f) => ({ ...f, page: p }))} />
            </>
          )}
      </div>
      <RequestDetailDialog requestId={openId} mode={opts.isAdmin ? "admin" : "team"} onClose={() => setOpenId(null)} />
    </div>
  );
}
