import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Eye, Loader2, MessageSquare, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { leaveAdminApi, leaveApi, type LeaveRequest, type RequestFilters } from "@/api/leave";
import { FilterSelect } from "@/components/leave/FilterSelect";
import { RequestDetailDialog } from "@/components/leave/RequestDetailDialog";
import { SortHead } from "@/components/leave/request-filters";
import { useFilterOptions } from "@/components/leave/useFilterOptions";
import { EmptyState, MiniStat, Pager, STATUS_LABEL, StatusBadge, errorText, fmtDate, fmtDays } from "@/components/leave/leave-ui";

export const Route = createFileRoute("/leave/admin/approvals")({
  head: () => ({ meta: [{ title: "Leave Approvals" }] }),
  component: ApprovalsPage,
});

type Pending = { request: LeaveRequest; action: "approve" | "reject" | "comment" };

function ApprovalsPage() {
  const qc = useQueryClient();
  const opts = useFilterOptions();
  const [filters, setFilters] = useState<RequestFilters>({ status: "pending,cancellation_pending", page: 1, page_size: 20, sort_by: "applied_at", sort_dir: 1 });
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const q = useQuery({ queryKey: ["leave-admin", "requests", filters], queryFn: () => leaveAdminApi.requests(filters), placeholderData: (p) => p });
  const set = (patch: Partial<RequestFilters>) => setFilters((f) => ({ ...f, ...patch, page: 1 }));
  const onSort = (field: string) => setFilters((f) => ({ ...f, sort_by: field, sort_dir: f.sort_by === field && f.sort_dir === -1 ? 1 : -1 }));
  const stats = q.data?.stats;

  const act = async () => {
    if (!pending) return;
    const { request, action } = pending;
    if ((action === "reject" || action === "comment") && comment.trim().length < (action === "reject" ? 3 : 1)) {
      toast.error(action === "reject" ? "Enter a reason of at least 3 characters" : "Enter a comment");
      return;
    }
    setBusy(true);
    try {
      if (action === "approve") toast.success((await leaveAdminApi.approve(request.id, comment.trim())).message);
      else if (action === "reject") toast.success((await leaveAdminApi.reject(request.id, comment.trim())).message);
      else {
        await leaveApi.comment(request.id, comment.trim());
        toast.success("Comment added");
      }
      setPending(null);
      setComment("");
    } catch (e) {
      toast.error("Action failed", { description: errorText(e) });
    } finally {
      setBusy(false);
      qc.invalidateQueries({ queryKey: ["leave-admin"] });
      qc.invalidateQueries({ queryKey: ["leave"] });
    }
  };

  const statusCard = (label: string, value: number | undefined, status: string | undefined, tone: "default" | "pending" | "approved" | "rejected") => (
    <MiniStat label={label} value={value ?? "-"} tone={tone} active={filters.status === status} onClick={() => set({ status })} />
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {statusCard("Total Requests", stats?.total, undefined, "default")}
        {statusCard("Pending Requests", (stats?.pending ?? 0) + (stats?.cancellation_pending ?? 0), "pending,cancellation_pending", "pending")}
        {statusCard("Approved Requests", stats?.approved, "approved", "approved")}
        {statusCard("Rejected Requests", stats?.rejected, "rejected", "rejected")}
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4 shadow-sm">
        <form className="space-y-1" onSubmit={(e) => { e.preventDefault(); set({ search: search.trim() || undefined }); }}>
          <Label className="text-xs text-muted-foreground">Employee</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} onBlur={() => set({ search: search.trim() || undefined })} placeholder="Name, ID or request no" className="w-56 pl-8" />
          </div>
        </form>
        <FilterSelect label="Employee type" value={filters.employee_type_id} onChange={(v) => set({ employee_type_id: v })} options={opts.employeeTypes} allLabel="All employee types" />
        <FilterSelect label="Department" value={filters.department_id} onChange={(v) => set({ department_id: v })} options={opts.departments} allLabel="All departments" />
        <FilterSelect label="Leave type" value={filters.leave_type_id} onChange={(v) => set({ leave_type_id: v })} options={opts.leaveTypes} allLabel="All leave types" />
        <FilterSelect label="Status" value={filters.status} onChange={(v) => set({ status: v })} allLabel="All statuses"
          options={[{ id: "pending,cancellation_pending", name: "Awaiting decision" }, ...Object.entries(STATUS_LABEL).map(([id, name]) => ({ id, name }))]} />
        <div className="space-y-1"><Label className="text-xs text-muted-foreground">From</Label><Input type="date" value={filters.from_date ?? ""} onChange={(e) => set({ from_date: e.target.value || undefined })} className="w-40" /></div>
        <div className="space-y-1"><Label className="text-xs text-muted-foreground">To</Label><Input type="date" value={filters.to_date ?? ""} onChange={(e) => set({ to_date: e.target.value || undefined })} className="w-40" /></div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        {q.isLoading ? <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
          : q.isError ? <EmptyState title="Could not load requests" description={errorText(q.error)} />
          : !q.data?.items.length ? <EmptyState title="No requests" description="Nothing matches these filters." />
          : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Emp ID</TableHead><TableHead>Employee Name</TableHead><TableHead>Employee Type</TableHead><TableHead>Department</TableHead>
                      <TableHead>Leave Type</TableHead>
                      <SortHead label="From" field="from_date" filters={filters} onSort={onSort} />
                      <SortHead label="To" field="to_date" filters={filters} onSort={onSort} />
                      <SortHead label="Duration" field="days" filters={filters} onSort={onSort} />
                      <TableHead>Reason</TableHead>
                      <SortHead label="Applied" field="applied_at" filters={filters} onSort={onSort} />
                      <SortHead label="Status" field="status" filters={filters} onSort={onSort} />
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {q.data.items.map((r) => {
                      const decidable = r.status === "pending" || r.status === "cancellation_pending";
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="whitespace-nowrap">{r.employee.employee_id || "-"}</TableCell>
                          <TableCell className="font-medium whitespace-nowrap">{r.employee.name}</TableCell>
                          <TableCell>{r.employee.employee_type || "-"}</TableCell>
                          <TableCell>{r.employee.department || "-"}</TableCell>
                          <TableCell className="whitespace-nowrap"><span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ backgroundColor: r.leave_type.color }} />{r.leave_type.name}</span></TableCell>
                          <TableCell className="whitespace-nowrap">{fmtDate(r.from_date)}</TableCell>
                          <TableCell className="whitespace-nowrap">{fmtDate(r.to_date)}</TableCell>
                          <TableCell>{fmtDays(r.days)}{r.half_day ? " (½)" : ""}</TableCell>
                          <TableCell className="max-w-48 truncate" title={r.reason ?? ""}>{r.reason || "-"}</TableCell>
                          <TableCell className="whitespace-nowrap">{fmtDate(r.applied_at)}</TableCell>
                          <TableCell><StatusBadge status={r.status} /></TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Button size="icon" variant="ghost" className="size-8" title="View" onClick={() => setOpenId(r.id)}><Eye className="size-4" /></Button>
                              <Button size="icon" variant="ghost" className="size-8" title="Add comment" onClick={() => { setComment(""); setPending({ request: r, action: "comment" }); }}><MessageSquare className="size-4" /></Button>
                              {decidable && (
                                <>
                                  <Button size="icon" variant="ghost" className="size-8 text-emerald-600" title={r.status === "cancellation_pending" ? "Approve cancellation" : "Approve"} onClick={() => { setComment(""); setPending({ request: r, action: "approve" }); }}><Check className="size-4" /></Button>
                                  <Button size="icon" variant="ghost" className="size-8 text-rose-600" title={r.status === "cancellation_pending" ? "Reject cancellation" : "Reject"} onClick={() => { setComment(""); setPending({ request: r, action: "reject" }); }}><X className="size-4" /></Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <Pager page={q.data.page} pageSize={q.data.page_size} total={q.data.total} onPage={(p) => setFilters((f) => ({ ...f, page: p }))} />
            </>
          )}
      </div>

      <Dialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {pending?.action === "comment" ? "Add comment" : `${pending?.action === "approve" ? "Approve" : "Reject"}${pending?.request.status === "cancellation_pending" ? " cancellation" : " leave"}`}
            </DialogTitle>
          </DialogHeader>
          {pending && (
            <p className="text-sm text-muted-foreground">
              {pending.request.employee.name} &middot; {pending.request.leave_type.name} &middot; {fmtDate(pending.request.from_date)} - {fmtDate(pending.request.to_date)} ({fmtDays(pending.request.days)} day(s))
            </p>
          )}
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} maxLength={1000}
            placeholder={pending?.action === "reject" ? "Reason for rejection (required)" : pending?.action === "approve" ? "Comment (optional)" : "Comment"} />
          <DialogFooter>
            <Button variant="secondary" onClick={() => setPending(null)} disabled={busy}>Cancel</Button>
            <Button disabled={busy} onClick={act}
              className={pending?.action === "reject" ? "bg-rose-600 text-white hover:bg-rose-700" : pending?.action === "approve" ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-navy text-navy-foreground hover:bg-navy/90"}>
              {busy && <Loader2 className="size-4 animate-spin" />} {pending?.action === "comment" ? "Post comment" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <RequestDetailDialog requestId={openId} mode="admin" onClose={() => setOpenId(null)} />
    </div>
  );
}
