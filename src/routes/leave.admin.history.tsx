import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { History, Loader2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { leaveAdminApi } from "@/api/leave";
import { FilterSelect } from "@/components/leave/FilterSelect";
import { EmptyState, PageTitle, Pager, STATUS_LABEL, errorText, fmtDateTime } from "@/components/leave/leave-ui";
import type { LeaveStatus } from "@/api/leave";

export const Route = createFileRoute("/leave/admin/history")({
  head: () => ({ meta: [{ title: "Approval History" }] }),
  component: HistoryPage,
});

const ACTIONS = [
  { id: "approved", name: "Approved" },
  { id: "rejected", name: "Rejected" },
  { id: "cancelled", name: "Cancelled by employee" },
  { id: "cancellation_requested", name: "Cancellation requested" },
  { id: "cancellation_approved", name: "Cancellation approved" },
  { id: "cancellation_rejected", name: "Cancellation rejected" },
  { id: "override_approved", name: "Override: approved" },
  { id: "override_rejected", name: "Override: rejected" },
  { id: "override_cancelled", name: "Override: cancelled" },
];
const ACTION_LABEL = Object.fromEntries(ACTIONS.map((a) => [a.id, a.name]));
const statusText = (s: string | null) => (s ? STATUS_LABEL[s as LeaveStatus] ?? s : "-");
const PAGE_SIZE = 25;

function HistoryPage() {
  return (
    <div className="space-y-4">
      <PageTitle icon={<History className="size-6" />} title="Approval History & Audit" subtitle="Every leave decision with who made it, when and why, plus the configuration audit trail." />
      <Tabs defaultValue="approvals">
        <TabsList>
          <TabsTrigger value="approvals">Approval history</TabsTrigger>
          <TabsTrigger value="audit">Audit trail</TabsTrigger>
        </TabsList>
        <TabsContent value="approvals"><ApprovalsTab /></TabsContent>
        <TabsContent value="audit"><AuditTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function ApprovalsTab() {
  const [action, setAction] = useState<string | undefined>();
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const params = { action, search: term || undefined, from_date: from || undefined, to_date: to || undefined, page, page_size: PAGE_SIZE };
  const q = useQuery({ queryKey: ["leave-admin", "approvals", params], queryFn: () => leaveAdminApi.approvals(params) });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4 shadow-sm">
        <form className="space-y-1" onSubmit={(e) => { e.preventDefault(); setPage(1); setTerm(search.trim()); }}>
          <Label className="text-xs text-muted-foreground">Search</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} onBlur={() => { setPage(1); setTerm(search.trim()); }} placeholder="Employee or request no" className="w-56 pl-8" />
          </div>
        </form>
        <FilterSelect label="Action" value={action} onChange={(v) => { setPage(1); setAction(v); }} options={ACTIONS} allLabel="All actions" className="w-56" />
        <div className="space-y-1"><Label className="text-xs text-muted-foreground">From</Label><Input type="date" value={from} onChange={(e) => { setPage(1); setFrom(e.target.value); }} className="w-40" /></div>
        <div className="space-y-1"><Label className="text-xs text-muted-foreground">To</Label><Input type="date" value={to} min={from} onChange={(e) => { setPage(1); setTo(e.target.value); }} className="w-40" /></div>
      </div>
      <div className="rounded-xl border bg-card shadow-sm">
        {q.isLoading ? <Loader2 className="mx-auto my-10 size-5 animate-spin" /> : q.isError ? <EmptyState title="Could not load history" description={errorText(q.error)} /> : !q.data?.items.length ? <EmptyState title="No decisions yet" /> : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow><TableHead>When</TableHead><TableHead>Request</TableHead><TableHead>Employee</TableHead><TableHead>Leave Type</TableHead><TableHead>Action</TableHead><TableHead>Status change</TableHead><TableHead>By</TableHead><TableHead>Comment</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {q.data.items.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-xs">{fmtDateTime(r.created_at)}</TableCell>
                    <TableCell className="font-mono text-xs">{r.request_no}</TableCell>
                    <TableCell>{r.employee_code ? `${r.employee_code} - ` : ""}{r.employee}</TableCell>
                    <TableCell>{r.leave_type}</TableCell>
                    <TableCell><Badge variant="outline" className={r.action.startsWith("override") ? "border-amber-400 text-amber-700" : ""}>{ACTION_LABEL[r.action] ?? r.action}</Badge></TableCell>
                    <TableCell className="whitespace-nowrap text-xs">{statusText(r.from_status)} &rarr; {statusText(r.to_status)}</TableCell>
                    <TableCell className="text-xs">{r.actor}<span className="block capitalize text-muted-foreground">{r.actor_role?.replace("_", " ")}</span></TableCell>
                    <TableCell className="max-w-64 truncate text-xs" title={r.comment ?? ""}>{r.comment || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {q.data && <Pager page={page} pageSize={PAGE_SIZE} total={q.data.total} onPage={setPage} />}
      </div>
    </div>
  );
}

function AuditTab() {
  const [page, setPage] = useState(1);
  const q = useQuery({ queryKey: ["leave-admin", "audit", page], queryFn: () => leaveAdminApi.audit(page, PAGE_SIZE) });
  return (
    <div className="rounded-xl border bg-card shadow-sm">
      {q.isLoading ? <Loader2 className="mx-auto my-10 size-5 animate-spin" /> : q.isError ? <EmptyState title="Could not load audit trail" description={errorText(q.error)} /> : !q.data?.items.length ? <EmptyState title="No audit entries" /> : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>When</TableHead><TableHead>Action</TableHead><TableHead>Entity</TableHead><TableHead>By</TableHead><TableHead>Details</TableHead></TableRow></TableHeader>
            <TableBody>
              {q.data.items.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-xs">{fmtDateTime(r.created_at)}</TableCell>
                  <TableCell className="font-medium">{r.action.replace(/[._]/g, " ")}</TableCell>
                  <TableCell className="text-xs capitalize">{r.entity?.replace("_", " ")}</TableCell>
                  <TableCell className="text-xs">{r.actor}<span className="block capitalize text-muted-foreground">{r.actor_role?.replace("_", " ")}</span></TableCell>
                  <TableCell className="max-w-md">
                    <code className="block truncate text-[11px] text-muted-foreground" title={JSON.stringify(r.details, null, 1)}>{JSON.stringify(r.details)}</code>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {q.data && <Pager page={page} pageSize={PAGE_SIZE} total={q.data.total} onPage={setPage} />}
    </div>
  );
}
