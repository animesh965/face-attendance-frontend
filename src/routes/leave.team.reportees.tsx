import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LayoutGrid, List, Loader2, Phone, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { leaveApi } from "@/api/leave";
import { TONE_CLASS, TeamMemberSheet, initials, photoUrl, to12h } from "@/components/leave/TeamMemberSheet";
import { EmptyState, errorText } from "@/components/leave/leave-ui";

export const Route = createFileRoute("/leave/team/reportees")({
  head: () => ({ meta: [{ title: "Reportees" }] }),
  component: ReporteesPage,
});

function ReporteesPage() {
  const [scope, setScope] = useState<"direct" | "all">("direct");
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setTerm(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);
  const q = useQuery({ queryKey: ["leave", "reportees", scope, term], queryFn: () => leaveApi.reportees(scope, term || undefined), placeholderData: (p) => p });
  const data = q.data;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          {data && (
            <>
              <span className="flex size-7 items-center justify-center rounded bg-emerald-600 text-xs text-white">{initials(data.manager.name)[0]}</span>
              {data.manager.employee_id ? `${data.manager.employee_id} - ` : ""}{data.manager.name}
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border bg-card p-0.5 text-sm">
            <button onClick={() => setScope("direct")} className={cn("rounded px-3 py-1", scope === "direct" ? "bg-muted font-semibold" : "text-muted-foreground")}>Direct {data?.direct_count ?? ""}</button>
            <button onClick={() => setScope("all")} className={cn("rounded px-3 py-1", scope === "all" ? "border border-sky-500 bg-card font-semibold" : "text-muted-foreground")}>All {data?.all_count ?? ""}</button>
          </div>
          <div className="flex rounded-md border bg-card">
            <Button variant="ghost" size="icon" className={cn("size-8", layout === "grid" && "text-sky-600")} onClick={() => setLayout("grid")} aria-label="Grid view"><LayoutGrid className="size-4" /></Button>
            <Button variant="ghost" size="icon" className={cn("size-8", layout === "list" && "text-sky-600")} onClick={() => setLayout("list")} aria-label="List view"><List className="size-4" /></Button>
          </div>
          {showSearch ? (
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employee" className="h-9 w-56 pl-8" />
            </div>
          ) : (
            <Button variant="outline" size="icon" className="size-9" onClick={() => setShowSearch(true)} aria-label="Search"><Search className="size-4" /></Button>
          )}
        </div>
      </div>

      {q.isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      ) : q.isError ? (
        <EmptyState title="Could not load reportees" description={errorText(q.error)} />
      ) : !data?.members.length ? (
        <div className="rounded-xl border bg-card"><EmptyState title={term ? "No matching employees" : "No reportees"} description={term ? undefined : "Employees reporting to you will appear here."} /></div>
      ) : layout === "grid" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.members.map((m) => (
            <button key={m.id} onClick={() => setSelected(m.id)} className="rounded-lg border bg-card text-left shadow-sm transition-shadow hover:shadow-md">
              <div className="flex items-start gap-3 p-3">
                <Avatar className="size-14 rounded-md">
                  <AvatarImage src={photoUrl(m.photo)} alt={m.name} />
                  <AvatarFallback className="rounded-md bg-navy/10 text-navy">{initials(m.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.employee_id ? `${m.employee_id} - ` : ""}{m.name}</p>
                  <p className={cn("truncate text-xs", TONE_CLASS[m.tone])}>{m.status}</p>
                  {m.employee_type && <p className="truncate text-[11px] text-muted-foreground">{m.employee_type}</p>}
                </div>
                <Phone className="size-4 shrink-0 text-muted-foreground" />
              </div>
              <div className="border-t px-3 py-2.5 text-xs text-muted-foreground">
                {m.shift.name} - {to12h(m.shift.start_time)} - {to12h(m.shift.end_time)}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Employee</TableHead><TableHead>Employee Type</TableHead><TableHead>Department</TableHead><TableHead>Status</TableHead><TableHead>Shift</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {data.members.map((m) => (
                <TableRow key={m.id} className="cursor-pointer" onClick={() => setSelected(m.id)}>
                  <TableCell className="font-medium">{m.employee_id ? `${m.employee_id} - ` : ""}{m.name}</TableCell>
                  <TableCell>{m.employee_type || "-"}</TableCell>
                  <TableCell>{m.department || "-"}</TableCell>
                  <TableCell className={TONE_CLASS[m.tone]}>{m.status}</TableCell>
                  <TableCell className="text-xs">{m.shift.name} - {to12h(m.shift.start_time)} - {to12h(m.shift.end_time)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <TeamMemberSheet employeeId={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
