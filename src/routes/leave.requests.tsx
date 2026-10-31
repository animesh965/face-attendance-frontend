import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Loader2, MoreHorizontal, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { leaveAdminApi, leaveApi, type LeaveRequest, type RequestFilters, type SavedView } from "@/api/leave";
import { ApplyLeaveDialog } from "@/components/leave/ApplyLeaveDialog";
import { RequestDetailDialog } from "@/components/leave/RequestDetailDialog";
import { EmptyState, Pager, StatusBadge, errorText, fmtDate, fmtDays, isoDay } from "@/components/leave/leave-ui";
import { RequestFilterPanel, SortHead } from "@/components/leave/request-filters";

export const Route = createFileRoute("/leave/requests")({
  head: () => ({ meta: [{ title: "Leave Requests" }] }),
  component: MyLeaveRequestsPage,
});

const DEFAULT_FILTERS: RequestFilters = { sort_by: "applied_at", sort_dir: -1, page: 1, page_size: 20 };

function MyLeaveRequestsPage() {
  const qc = useQueryClient();
  const [filters, setFilters] = useState<RequestFilters>(DEFAULT_FILTERS);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<SavedView | null>(null);
  const [viewSearch, setViewSearch] = useState("");
  const [viewMenu, setViewMenu] = useState(false);
  const [createView, setCreateView] = useState(false);
  const [viewName, setViewName] = useState("");
  const [applyOpen, setApplyOpen] = useState(false);
  const [editing, setEditing] = useState<LeaveRequest | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const q = useQuery({ queryKey: ["leave", "my-requests", filters], queryFn: () => leaveApi.myRequests(filters), placeholderData: (p) => p });
  const viewsQ = useQuery({ queryKey: ["leave", "views"], queryFn: leaveApi.views });
  const typesQ = useQuery({ queryKey: ["leave", "all-types"], queryFn: () => leaveAdminApi.leaveTypes(true) });

  const onSort = (field: string) =>
    setFilters((f) => ({ ...f, sort_by: field, sort_dir: f.sort_by === field && f.sort_dir === -1 ? 1 : -1, page: 1 }));

  const selectView = (v: SavedView | null) => {
    setView(v);
    setViewMenu(false);
    setFilters(v ? { ...DEFAULT_FILTERS, ...v.filters, page: 1 } : DEFAULT_FILTERS);
    setSearch(v?.filters.search ?? "");
  };

  const saveView = async () => {
    try {
      const { page, page_size, ...rest } = filters;
      void page; void page_size;
      const saved = await leaveApi.saveView(viewName.trim(), rest);
      toast.success(`View "${saved.name}" saved`);
      setCreateView(false);
      setViewName("");
      await qc.invalidateQueries({ queryKey: ["leave", "views"] });
      setView(saved);
    } catch (e) {
      toast.error("Could not save view", { description: errorText(e) });
    }
  };

  const deleteView = async (v: SavedView) => {
    try {
      await leaveApi.deleteView(v.id);
      toast.success("View deleted");
      if (view?.id === v.id) selectView(null);
      qc.invalidateQueries({ queryKey: ["leave", "views"] });
    } catch (e) {
      toast.error("Could not delete view", { description: errorText(e) });
    }
  };

  const cancelRequest = async (r: LeaveRequest) => {
    try {
      const res = await leaveApi.cancel(r.id);
      toast.success(res.message);
      qc.invalidateQueries({ queryKey: ["leave"] });
    } catch (e) {
      toast.error("Could not cancel", { description: errorText(e) });
    }
  };

  const data = q.data;
  const today = isoDay(new Date());
  const views = (viewsQ.data ?? []).filter((v) => v.name.toLowerCase().includes(viewSearch.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Popover open={viewMenu} onOpenChange={setViewMenu}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-52 justify-between border-sky-500">{view?.name ?? "Leave"} <ChevronDown className="size-4" /></Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-60 p-0">
              <div className="border-b p-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input autoFocus value={viewSearch} onChange={(e) => setViewSearch(e.target.value)} className="h-8 pl-7" />
                </div>
              </div>
              <p className="px-3 pt-2 text-xs text-muted-foreground">Public views</p>
              <button className="w-full px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => selectView(null)}>Leave</button>
              {views.length > 0 && <p className="px-3 pt-2 text-xs text-muted-foreground">My views</p>}
              {views.map((v) => (
                <div key={v.id} className="flex items-center hover:bg-muted">
                  <button className="flex-1 px-3 py-2 text-left text-sm" onClick={() => selectView(v)}>{v.name}</button>
                  <button className="px-2 text-muted-foreground hover:text-rose-600" aria-label={`Delete view ${v.name}`} onClick={() => deleteView(v)}><Trash2 className="size-3.5" /></button>
                </div>
              ))}
              <div className="border-t p-2 text-center">
                <Button variant="outline" size="sm" className="border-sky-500 text-sky-600" onClick={() => { setViewMenu(false); setCreateView(true); }}>Create View</Button>
              </div>
            </PopoverContent>
          </Popover>
          <form className="relative" onSubmit={(e) => { e.preventDefault(); setFilters((f) => ({ ...f, search: search.trim() || undefined, page: 1 })); }}>
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search request no, reason, type" className="w-64 pl-8" />
          </form>
        </div>
        <div className="flex items-center gap-2">
          <RequestFilterPanel filters={filters} onApply={setFilters} leaveTypes={typesQ.data ?? []} />
          <Button className="bg-sky-500 text-white hover:bg-sky-600" onClick={() => setApplyOpen(true)}>Add Request</Button>
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        {q.isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
        ) : q.isError ? (
          <EmptyState title="Could not load requests" description={errorText(q.error)} />
        ) : !data?.items.length ? (
          <EmptyState action={<Button className="bg-sky-500 text-white hover:bg-sky-600" onClick={() => setApplyOpen(true)}>Add Request</Button>} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request</TableHead>
                    <TableHead>Leave Type</TableHead>
                    <SortHead label="From" field="from_date" filters={filters} onSort={onSort} />
                    <SortHead label="To" field="to_date" filters={filters} onSort={onSort} />
                    <SortHead label="Days" field="days" filters={filters} onSort={onSort} />
                    <SortHead label="Status" field="status" filters={filters} onSort={onSort} />
                    <SortHead label="Applied On" field="applied_at" filters={filters} onSort={onSort} />
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((r) => (
                    <TableRow key={r.id} className="cursor-pointer" onClick={() => setOpenId(r.id)}>
                      <TableCell className="font-medium text-navy">{r.request_no}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ backgroundColor: r.leave_type.color }} />{r.leave_type.name}</span>
                      </TableCell>
                      <TableCell>{fmtDate(r.from_date)}</TableCell>
                      <TableCell>{fmtDate(r.to_date)}</TableCell>
                      <TableCell>{fmtDays(r.days)}{r.half_day ? " (½)" : ""}</TableCell>
                      <TableCell><StatusBadge status={r.status} /></TableCell>
                      <TableCell>{fmtDate(r.applied_at)}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-8" aria-label="Actions"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setOpenId(r.id)}>View details &amp; history</DropdownMenuItem>
                            {r.status === "pending" && <DropdownMenuItem onClick={() => setEditing(r)}>Edit</DropdownMenuItem>}
                            {r.status === "pending" && <DropdownMenuItem className="text-rose-600" onClick={() => cancelRequest(r)}>Cancel request</DropdownMenuItem>}
                            {r.status === "approved" && r.from_date > today && (
                              <DropdownMenuItem className="text-rose-600" onClick={() => setOpenId(r.id)}>Request cancellation</DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Pager page={data.page} pageSize={data.page_size} total={data.total} onPage={(p) => setFilters((f) => ({ ...f, page: p }))} />
          </>
        )}
      </div>

      <Dialog open={createView} onOpenChange={setCreateView}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Create view</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Saves the current search, filters and sort order.</p>
          <Input value={viewName} onChange={(e) => setViewName(e.target.value)} placeholder="View name" maxLength={60} />
          <DialogFooter>
            <Button variant="secondary" onClick={() => setCreateView(false)}>Cancel</Button>
            <Button className="bg-navy text-navy-foreground hover:bg-navy/90" disabled={!viewName.trim()} onClick={saveView}>Save view</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ApplyLeaveDialog open={applyOpen || !!editing} onOpenChange={(o) => { if (!o) { setApplyOpen(false); setEditing(null); } }} editing={editing} />
      <RequestDetailDialog requestId={openId} mode="self" onClose={() => setOpenId(null)} />
    </div>
  );
}
