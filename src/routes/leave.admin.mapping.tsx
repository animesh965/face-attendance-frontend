import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, History, Loader2, Minus, Search, UserCheck, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  leaveAdminApi, type EligibilityInfo, type EmployeeBrief, type EmployeeType, type LeaveType, type Mapping,
  type MappingChangeSummary,
} from "@/api/leave";
import { EmptyState, HelpButton, TriCheckbox, errorText, fmtDate, fmtDateTime } from "@/components/leave/leave-ui";

export const Route = createFileRoute("/leave/admin/mapping")({
  head: () => ({ meta: [{ title: "Employee Leave Mapping" }] }),
  component: EmployeeLeaveMappingPage,
});

type Tri = boolean | "indeterminate";
const ALL = "__all__";

function EmployeeLeaveMappingPage() {
  const [tab, setTab] = useState<"type" | "employee">("type");
  const leaveTypesQ = useQuery({ queryKey: ["leave-admin", "leave-types"], queryFn: () => leaveAdminApi.leaveTypes(true) });
  const employeeTypesQ = useQuery({ queryKey: ["leave-admin", "employee-types"], queryFn: () => leaveAdminApi.employeeTypes(false) });
  const leaveTypes = useMemo(() => (leaveTypesQ.data ?? []).filter((x) => x.is_active), [leaveTypesQ.data]);

  return (
    <section className="space-y-4 rounded-xl border bg-card p-4 shadow-sm md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <UserCheck className="size-6 text-navy" />
          <h2 className="text-2xl font-semibold tracking-tight">Employee Leave Mapping</h2>
        </div>
        <HelpButton title="How leave mapping works">
          <p><b>Employee Type Wise:</b> select one or more employee types on the right. The left column then shows the leave types they currently have (a dash means only some of the selected types have it). Tick or untick leave types and Save to replace their mapping.</p>
          <p><b>Employee Wise:</b> select employees and leave types, then Enable or Disable to create an individual override, or Reset to fall back to the employee type mapping.</p>
          <p>An individual override always wins over the employee type mapping. Employees only see mapped leave types when applying, and the server rejects anything else.</p>
          <p>Mapping decides <i>eligibility</i> only. The number of days comes from Leave Policies and Leave Allocation.</p>
        </HelpButton>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-lg bg-navy p-2" role="tablist">
        {([["type", "Employee Type Wise Leave Master"], ["employee", "Employee Wise Leave Master"]] as const).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              "rounded-md px-3 py-2.5 text-xs font-semibold transition-colors sm:text-sm",
              tab === key ? "bg-card text-navy shadow-sm" : "text-navy-foreground hover:bg-white/10",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {leaveTypesQ.isLoading || employeeTypesQ.isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      ) : leaveTypesQ.isError || employeeTypesQ.isError ? (
        <EmptyState title="Could not load mapping data" description={errorText(leaveTypesQ.error ?? employeeTypesQ.error)} />
      ) : leaveTypes.length === 0 ? (
        <EmptyState title="No active leave types" description="Create leave types under Admin > Leave Types before mapping them." />
      ) : tab === "type" ? (
        <TypeWiseTab leaveTypes={leaveTypes} employeeTypes={employeeTypesQ.data ?? []} />
      ) : (
        <EmployeeWiseTab leaveTypes={leaveTypes} employeeTypes={employeeTypesQ.data ?? []} />
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// shared column
// ---------------------------------------------------------------------------

interface ColumnItem {
  id: string;
  label: ReactNode;
  checked: Tri;
  extra?: ReactNode;
}

function CheckColumn({
  title, items, allState, onToggle, onToggleAll, toolbar, emptyText, height = "h-[300px]",
}: {
  title: string;
  items: ColumnItem[];
  allState: Tri;
  onToggle: (id: string, value: boolean) => void;
  onToggleAll: (value: boolean) => void;
  toolbar?: ReactNode;
  emptyText: string;
  height?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col">
      <p className="mb-1 text-sm font-semibold">{title}</p>
      <label className="mb-2 flex w-fit cursor-pointer items-center gap-2 pl-0.5 text-sm text-muted-foreground">
        <TriCheckbox checked={allState} onCheckedChange={onToggleAll} disabled={!items.length} aria-label={`Check all ${title}`} />
        Check all
      </label>
      {toolbar}
      <div className={cn("overflow-y-auto rounded-md border", height)}>
        {items.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          items.map((item) => (
            <label
              key={item.id}
              className="flex min-h-[56px] cursor-pointer items-center gap-3 border-b px-4 py-2.5 text-sm last:border-b-0 hover:bg-muted/40"
            >
              <TriCheckbox checked={item.checked} onCheckedChange={(v) => onToggle(item.id, v)} />
              <span className="min-w-0 flex-1">{item.label}</span>
              {item.extra}
            </label>
          ))
        )}
      </div>
    </div>
  );
}

function allStateOf(values: Tri[]): Tri {
  if (!values.length) return false;
  if (values.every((v) => v === true)) return true;
  if (values.every((v) => v === false)) return false;
  return "indeterminate";
}

// ---------------------------------------------------------------------------
// Tab A: employee type wise
// ---------------------------------------------------------------------------

function TypeWiseTab({ leaveTypes, employeeTypes }: { leaveTypes: LeaveType[]; employeeTypes: EmployeeType[] }) {
  const qc = useQueryClient();
  const mappingsQ = useQuery({ queryKey: ["leave-admin", "type-mappings"], queryFn: leaveAdminApi.typeMappings });
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [edits, setEdits] = useState<Map<string, boolean>>(new Map());
  const [confirm, setConfirm] = useState<MappingChangeSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [historyFor, setHistoryFor] = useState<EmployeeType | null>(null);

  const enabled = useMemo(() => {
    const set = new Set<string>();
    for (const m of mappingsQ.data ?? []) if (m.enabled && m.employee_type_id) set.add(`${m.employee_type_id}:${m.leave_type_id}`);
    return set;
  }, [mappingsQ.data]);

  const baseState = (ltId: string): Tri => {
    const selected = [...selectedTypes];
    if (!selected.length) return false;
    const hits = selected.filter((et) => enabled.has(`${et}:${ltId}`)).length;
    return hits === 0 ? false : hits === selected.length ? true : "indeterminate";
  };
  const leaveState = (ltId: string): Tri => (edits.has(ltId) ? (edits.get(ltId) as boolean) : baseState(ltId));

  const leaveItems: ColumnItem[] = leaveTypes.map((lt) => ({
    id: lt.id,
    checked: leaveState(lt.id),
    label: (
      <span className="flex items-center gap-2">
        <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: lt.color }} />
        {lt.name} <span className="text-xs text-muted-foreground">({lt.code})</span>
      </span>
    ),
    extra: edits.has(lt.id) ? <Badge variant="outline" className="text-[10px]">changed</Badge> : null,
  }));
  const typeItems: ColumnItem[] = employeeTypes.map((et) => ({
    id: et.id,
    checked: selectedTypes.has(et.id),
    label: et.name,
    extra: <span className="text-xs text-muted-foreground">{et.employee_count} emp</span>,
  }));

  const setLeave = (id: string, value: boolean) => setEdits((prev) => new Map(prev).set(id, value));
  const setAllLeave = (value: boolean) => setEdits(new Map(leaveTypes.map((lt) => [lt.id, value])));
  const toggleType = (id: string, value: boolean) =>
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (value) next.add(id);
      else next.delete(id);
      return next;
    });

  const payload = () => ({
    employee_type_ids: [...selectedTypes],
    leave_type_ids: leaveTypes.filter((lt) => leaveState(lt.id) === true).map((lt) => lt.id),
    unchanged_leave_type_ids: leaveTypes.filter((lt) => leaveState(lt.id) === "indeterminate").map((lt) => lt.id),
  });

  const review = async () => {
    if (!selectedTypes.size) {
      toast.error("Select at least one employee type");
      return;
    }
    setBusy(true);
    try {
      const summary = await leaveAdminApi.saveTypeMappings(payload(), true);
      if (!summary.added && !summary.removed) toast.info("No changes to save", { description: "The selected employee types already have this mapping." });
      else setConfirm(summary);
    } catch (e) {
      toast.error("Could not validate mapping", { description: errorText(e) });
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setBusy(true);
    try {
      const result = await leaveAdminApi.saveTypeMappings(payload(), false);
      toast.success("Leave mapping saved", { description: `${result.added} added, ${result.removed} removed` });
      setConfirm(null);
      setEdits(new Map());
      await qc.invalidateQueries({ queryKey: ["leave-admin", "type-mappings"] });
      qc.invalidateQueries({ queryKey: ["leave"] });
    } catch (e) {
      toast.error("Could not save mapping", { description: errorText(e) });
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => {
    setEdits(new Map());
    setSelectedTypes(new Set());
  };

  if (!employeeTypes.length) {
    return <EmptyState title="No employee types" description="Create employee types under Admin > Employees & Types, then map leave types to them." />;
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border p-3 md:p-4">
        <div className="grid gap-6 md:grid-cols-2">
          <CheckColumn
            title="Leave Type"
            items={leaveItems}
            allState={allStateOf(leaveItems.map((i) => i.checked))}
            onToggle={setLeave}
            onToggleAll={setAllLeave}
            emptyText="No leave types"
          />
          <CheckColumn
            title="Employee Type Name"
            items={typeItems}
            allState={allStateOf(typeItems.map((i) => i.checked))}
            onToggle={toggleType}
            onToggleAll={(v) => setSelectedTypes(v ? new Set(employeeTypes.map((e) => e.id)) : new Set())}
            emptyText="No employee types"
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {selectedTypes.size
            ? `${selectedTypes.size} employee type(s) selected. A dash means only some of them currently have that leave type; it is left unchanged unless you tick or untick it.`
            : "Select employee types to see and edit their leave types."}
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={cancel} disabled={busy}>Cancel</Button>
          <Button className="bg-navy text-navy-foreground hover:bg-navy/90" onClick={review} disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" />} Save
          </Button>
        </div>
      </div>

      <div className="rounded-lg border">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-semibold">Current mapping overview</p>
          <span className="text-xs text-muted-foreground">Click a column to select that employee type</span>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-40">Leave Type</TableHead>
                {employeeTypes.map((et) => (
                  <TableHead key={et.id} className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button className="font-semibold hover:text-navy hover:underline" onClick={() => setSelectedTypes(new Set([et.id]))}>
                        {et.name}
                      </button>
                      <button aria-label={`History for ${et.name}`} className="text-muted-foreground hover:text-navy" onClick={() => setHistoryFor(et)}>
                        <History className="size-3.5" />
                      </button>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaveTypes.map((lt) => (
                <TableRow key={lt.id}>
                  <TableCell className="font-medium">{lt.name}</TableCell>
                  {employeeTypes.map((et) => (
                    <TableCell key={et.id} className="text-center">
                      {enabled.has(`${et.id}:${lt.id}`) ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600"><Check className="size-4" /> Yes</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-muted-foreground"><Minus className="size-4" /> No</span>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Replace existing mappings?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.added} leave type mapping(s) will be added and {confirm?.removed} removed. Employees of these types will immediately see the change when applying for leave. Previous mappings are kept in history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border p-2 text-sm">
            {confirm?.changes.map((c, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <span>{c.employee_type} &middot; {c.leave_type}</span>
                <Badge variant="outline" className={c.change === "added" ? "text-emerald-700" : "text-rose-700"}>{c.change}</Badge>
              </div>
            ))}
          </div>
          {!!confirm?.employee_types_without_leave.length && (
            <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
              Warning: {confirm.employee_types_without_leave.join(", ")} will have no leave types at all. Employees of
              these types will not be able to apply for any leave unless they have individual overrides.
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Go back</AlertDialogCancel>
            <AlertDialogAction className="bg-navy text-navy-foreground hover:bg-navy/90" disabled={busy} onClick={(e) => { e.preventDefault(); save(); }}>
              {busy && <Loader2 className="size-4 animate-spin" />} Confirm and save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MappingHistoryDialog
        title={historyFor ? `Mapping history - ${historyFor.name}` : ""}
        params={historyFor ? { employee_type_id: historyFor.id } : null}
        leaveTypes={leaveTypes}
        onClose={() => setHistoryFor(null)}
      />
    </div>
  );
}

function MappingHistoryDialog({ title, params, leaveTypes, onClose }: {
  title: string; params: { employee_type_id?: string; employee_id?: string } | null; leaveTypes: LeaveType[]; onClose: () => void;
}) {
  const q = useQuery({
    queryKey: ["leave-admin", "mapping-history", params],
    queryFn: () => leaveAdminApi.mappingHistory(params ?? {}),
    enabled: !!params,
  });
  const names = Object.fromEntries(leaveTypes.map((l) => [l.id, l.name]));
  return (
    <Dialog open={!!params} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="max-h-[60vh] overflow-auto">
          {q.isLoading ? <Loader2 className="mx-auto size-5 animate-spin" /> : !q.data?.length ? <EmptyState title="No history yet" /> : (
            <Table>
              <TableHeader><TableRow><TableHead>Leave Type</TableHead><TableHead>State</TableHead><TableHead>Effective</TableHead><TableHead>Changed</TableHead></TableRow></TableHeader>
              <TableBody>
                {q.data.map((m) => (
                  <TableRow key={m.id} className={cn(!m.is_current && "text-muted-foreground")}>
                    <TableCell>{names[m.leave_type_id] ?? "Unknown"}</TableCell>
                    <TableCell>{m.enabled ? "Enabled" : "Disabled"}{m.is_current ? " (current)" : ""}</TableCell>
                    <TableCell className="text-xs">{fmtDate(m.effective_from)} to {m.effective_to ? fmtDate(m.effective_to) : "open"}</TableCell>
                    <TableCell className="text-xs">{fmtDateTime(m.created_at)}<br />{m.created_by ?? ""}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Tab B: employee wise (individual overrides)
// ---------------------------------------------------------------------------

type Action = "enable" | "disable" | "inherit";

function EmployeeWiseTab({ leaveTypes, employeeTypes }: { leaveTypes: LeaveType[]; employeeTypes: EmployeeType[] }) {
  const qc = useQueryClient();
  const employeesQ = useQuery({ queryKey: ["leave-admin", "employees", "all"], queryFn: () => leaveAdminApi.employees({ page_size: 2000 }) });
  const departmentsQ = useQuery({ queryKey: ["leave-admin", "departments"], queryFn: leaveAdminApi.departments });
  const overridesQ = useQuery({ queryKey: ["leave-admin", "employee-mappings"], queryFn: () => leaveAdminApi.employeeMappings() });
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState(ALL);
  const [deptFilter, setDeptFilter] = useState(ALL);
  const [selectedEmp, setSelectedEmp] = useState<Set<string>>(new Set());
  const [selectedLeave, setSelectedLeave] = useState<Set<string>>(new Set());
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [effectiveTo, setEffectiveTo] = useState("");
  const [pending, setPending] = useState<Action | null>(null);
  const [busy, setBusy] = useState(false);
  const [eligibility, setEligibility] = useState<Record<string, Record<string, EligibilityInfo>>>({});
  const [historyFor, setHistoryFor] = useState<EmployeeBrief | null>(null);

  const employees = employeesQ.data?.items ?? [];
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return employees.filter((e) =>
      (typeFilter === ALL || (typeFilter === "none" ? !e.employee_type_id : e.employee_type_id === typeFilter)) &&
      (deptFilter === ALL || e.department_id === deptFilter) &&
      (!term || e.name.toLowerCase().includes(term) || e.employee_id.toLowerCase().includes(term)));
  }, [employees, search, typeFilter, deptFilter]);

  const selectedKey = [...selectedEmp].sort().join(",");
  useEffect(() => {
    if (!selectedKey) {
      setEligibility({});
      return;
    }
    let live = true;
    const ids = selectedKey.split(",").slice(0, 500);
    const t = setTimeout(() => {
      leaveAdminApi.eligibility(ids).then((r) => live && setEligibility(r)).catch((e) => toast.error("Could not load eligibility", { description: errorText(e) }));
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [selectedKey, overridesQ.dataUpdatedAt]);

  const statusFor = (ltId: string) => {
    const rows = Object.values(eligibility).map((e) => e[ltId]).filter((x): x is NonNullable<typeof x> => !!x);
    if (!rows.length) return null;
    if (rows.length === 1) {
      const r = rows[0]!;
      if (r.override?.in_effect) {
        return r.override.enabled
          ? <Badge className="bg-emerald-600 text-white">Enabled (override)</Badge>
          : <Badge className="bg-rose-600 text-white">Disabled (override)</Badge>;
      }
      return r.eligible
        ? <Badge variant="outline" className="text-emerald-700">Yes - from type</Badge>
        : <Badge variant="outline" className="text-muted-foreground">Not eligible</Badge>;
    }
    const yes = rows.filter((r) => r.eligible).length;
    const overrides = rows.filter((r) => r.override?.in_effect).length;
    return (
      <span className="text-right text-[11px] leading-tight text-muted-foreground">
        {yes}/{rows.length} eligible{overrides ? <><br />{overrides} override(s)</> : null}
      </span>
    );
  };

  const leaveItems: ColumnItem[] = leaveTypes.map((lt) => ({
    id: lt.id,
    checked: selectedLeave.has(lt.id),
    label: (
      <span className="flex items-center gap-2">
        <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: lt.color }} />
        {lt.name}
      </span>
    ),
    extra: statusFor(lt.id),
  }));
  const empItems: ColumnItem[] = filtered.map((e) => ({
    id: e.id,
    checked: selectedEmp.has(e.id),
    label: (
      <span className="block min-w-0">
        <span className="block truncate font-medium">{e.employee_id ? `${e.employee_id} - ` : ""}{e.name}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {e.employee_type || "No employee type"}{e.department ? ` · ${e.department}` : ""}
        </span>
      </span>
    ),
  }));

  const toggle = (setter: typeof setSelectedEmp) => (id: string, v: boolean) =>
    setter((prev) => {
      const next = new Set(prev);
      if (v) next.add(id);
      else next.delete(id);
      return next;
    });

  const ask = (action: Action) => {
    if (!selectedEmp.size) { toast.error("Select at least one employee"); return; }
    if (!selectedLeave.size) { toast.error("Select at least one leave type"); return; }
    if (effectiveFrom && effectiveTo && effectiveTo < effectiveFrom) { toast.error("Effective end date must be after the start date"); return; }
    setPending(action);
  };

  const apply = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      const r = await leaveAdminApi.saveEmployeeMappings({
        employee_ids: [...selectedEmp], leave_type_ids: [...selectedLeave], action: pending,
        effective_from: pending === "inherit" ? null : effectiveFrom || null,
        effective_to: pending === "inherit" ? null : effectiveTo || null,
      });
      toast.success(pending === "inherit" ? "Overrides removed" : "Individual mapping saved", {
        description: pending === "inherit" ? `${r.removed} override(s) removed` : `${r.created} override(s) saved, ${r.unchanged} unchanged`,
      });
      setPending(null);
      setSelectedLeave(new Set());
      await qc.invalidateQueries({ queryKey: ["leave-admin", "employee-mappings"] });
      qc.invalidateQueries({ queryKey: ["leave"] });
    } catch (e) {
      toast.error("Could not save", { description: errorText(e) });
    } finally {
      setBusy(false);
    }
  };

  const removeOverride = async (m: Mapping) => {
    if (!m.employee_id) return;
    try {
      await leaveAdminApi.saveEmployeeMappings({ employee_ids: [m.employee_id], leave_type_ids: [m.leave_type_id], action: "inherit" });
      toast.success("Override removed; employee type mapping applies again");
      qc.invalidateQueries({ queryKey: ["leave-admin", "employee-mappings"] });
    } catch (e) {
      toast.error("Could not remove override", { description: errorText(e) });
    }
  };

  const leaveNames = Object.fromEntries(leaveTypes.map((l) => [l.id, l.name]));
  const overrides = (overridesQ.data ?? []).filter((m) => !selectedEmp.size || (m.employee_id && selectedEmp.has(m.employee_id)));
  const actionText = { enable: "Enable", disable: "Disable", inherit: "Reset to employee type default for" }[pending ?? "enable"];

  return (
    <div className="space-y-5">
      <div className="rounded-lg border p-3 md:p-4">
        <div className="grid gap-6 md:grid-cols-2">
          <CheckColumn
            title="Leave Type"
            items={leaveItems}
            allState={allStateOf(leaveItems.map((i) => i.checked))}
            onToggle={toggle(setSelectedLeave)}
            onToggleAll={(v) => setSelectedLeave(v ? new Set(leaveTypes.map((l) => l.id)) : new Set())}
            emptyText="No leave types"
            height="h-[352px]"
          />
          <CheckColumn
            title="Employee Name"
            items={empItems}
            allState={allStateOf(filtered.map((e) => selectedEmp.has(e.id)))}
            onToggle={toggle(setSelectedEmp)}
            onToggleAll={(v) =>
              setSelectedEmp((prev) => {
                const next = new Set(prev);
                for (const e of filtered) {
                  if (v) next.add(e.id);
                  else next.delete(e.id);
                }
                return next;
              })
            }
            emptyText={employeesQ.isLoading ? "Loading employees..." : "No employees match the filters"}
            height="h-[260px]"
            toolbar={
              <div className="mb-2 grid gap-2 sm:grid-cols-3">
                <div className="relative sm:col-span-3">
                  <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or employee ID" className="h-9 pl-8" />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-9 sm:col-span-1"><SelectValue placeholder="Employee type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All employee types</SelectItem>
                    <SelectItem value="none">No employee type</SelectItem>
                    {employeeTypes.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={deptFilter} onValueChange={setDeptFilter}>
                  <SelectTrigger className="h-9 sm:col-span-1"><SelectValue placeholder="Department" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All departments</SelectItem>
                    {(departmentsQ.data ?? []).map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="self-center text-xs text-muted-foreground">{selectedEmp.size} selected</p>
              </div>
            }
          />
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Effective from (optional)</Label>
            <Input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} className="h-9 w-40" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Effective to (optional)</Label>
            <Input type="date" value={effectiveTo} onChange={(e) => setEffectiveTo(e.target.value)} className="h-9 w-40" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => { setSelectedEmp(new Set()); setSelectedLeave(new Set()); setEffectiveFrom(""); setEffectiveTo(""); }}>Cancel</Button>
          <Button variant="outline" onClick={() => ask("inherit")}>Reset to Type Default</Button>
          <Button variant="outline" className="border-rose-300 text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-500/10" onClick={() => ask("disable")}>Disable Selected</Button>
          <Button className="bg-navy text-navy-foreground hover:bg-navy/90" onClick={() => ask("enable")}>Save (Enable)</Button>
        </div>
      </div>

      <div className="rounded-lg border">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-semibold">Individual overrides {selectedEmp.size ? "for selected employees" : ""}</p>
          <span className="text-xs text-muted-foreground">{overrides.length} active</span>
        </div>
        {overridesQ.isLoading ? <Loader2 className="mx-auto my-6 size-5 animate-spin" /> : !overrides.length ? (
          <EmptyState title="No individual overrides" description="All employees follow their employee type mapping." />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead><TableHead>Employee Type</TableHead><TableHead>Leave Type</TableHead>
                  <TableHead>Override</TableHead><TableHead>Effective</TableHead><TableHead>Updated</TableHead><TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {overrides.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <button className="text-left hover:text-navy hover:underline" onClick={() => m.employee && setHistoryFor(m.employee)}>
                        {m.employee ? `${m.employee.employee_id ? m.employee.employee_id + " - " : ""}${m.employee.name}` : "Unknown"}
                      </button>
                    </TableCell>
                    <TableCell>{m.employee?.employee_type || "-"}</TableCell>
                    <TableCell>{leaveNames[m.leave_type_id] ?? "Inactive type"}</TableCell>
                    <TableCell>
                      {m.enabled ? <Badge className="bg-emerald-600 text-white">Enabled</Badge> : <Badge className="bg-rose-600 text-white">Disabled</Badge>}
                    </TableCell>
                    <TableCell className="text-xs">{m.effective_from ? fmtDate(m.effective_from) : "Always"}{m.effective_to ? ` to ${fmtDate(m.effective_to)}` : ""}</TableCell>
                    <TableCell className="text-xs">{fmtDateTime(m.updated_at)}<br />{m.updated_by}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => removeOverride(m)} title="Remove override">
                        <X className="size-4" /> Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{actionText} {selectedLeave.size} leave type(s) for {selectedEmp.size} employee(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              {pending === "inherit"
                ? "Individual overrides for these leave types will be removed. The employees will follow their employee type mapping again."
                : `This creates an individual override that takes priority over the employee type mapping${pending === "disable" ? ", so these employees will not be able to apply for these leave types" : ""}. Any existing override for the same leave type is replaced and kept in history.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <p className="text-sm">
            <span className="text-muted-foreground">Leave types: </span>
            {[...selectedLeave].map((id) => leaveNames[id]).join(", ")}
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Go back</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              className={pending === "disable" ? "bg-rose-600 hover:bg-rose-700" : "bg-navy text-navy-foreground hover:bg-navy/90"}
              onClick={(e) => { e.preventDefault(); apply(); }}
            >
              {busy && <Loader2 className="size-4 animate-spin" />} Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MappingHistoryDialog
        title={historyFor ? `Override history - ${historyFor.name}` : ""}
        params={historyFor ? { employee_id: historyFor.id } : null}
        leaveTypes={leaveTypes}
        onClose={() => setHistoryFor(null)}
      />
    </div>
  );
}
