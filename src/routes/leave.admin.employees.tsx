import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { leaveAdminApi, type EmployeeBrief, type EmployeeType } from "@/api/leave";
import { FilterSelect } from "@/components/leave/FilterSelect";
import { EmptyState, PageTitle, Pager, TriCheckbox, errorText, fmtDate } from "@/components/leave/leave-ui";

export const Route = createFileRoute("/leave/admin/employees")({
  head: () => ({ meta: [{ title: "Employee Leave Setup" }] }),
  component: EmployeesPage,
});

const NONE = "__none__";
const UNASSIGNED = "__unassigned__";

function EmployeesPage() {
  return (
    <div className="space-y-4">
      <PageTitle icon={<Users className="size-6" />} title="Employee Leave Setup"
        subtitle="Employee types drive leave mapping, policies and allocation. Assign each employee a type, reporting manager and joining details." />
      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <EmployeeTypesPanel />
        <EmployeesPanel />
      </div>
    </div>
  );
}

function EmployeeTypesPanel() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["leave-admin", "employee-types", "all"], queryFn: () => leaveAdminApi.employeeTypes(true) });
  const [editing, setEditing] = useState<EmployeeType | null>(null);
  const [form, setForm] = useState<{ name: string; code: string; description: string; is_active: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const open = (t?: EmployeeType) => {
    setEditing(t ?? null);
    setForm({ name: t?.name ?? "", code: t?.code ?? "", description: t?.description ?? "", is_active: t?.is_active ?? true });
  };

  const save = async () => {
    if (!form || form.name.trim().length < 2) { toast.error("Enter an employee type name"); return; }
    setBusy(true);
    try {
      const payload = { name: form.name.trim(), code: form.code.trim() || null, description: form.description.trim() || null, is_active: form.is_active };
      if (editing) await leaveAdminApi.updateEmployeeType(editing.id, payload);
      else await leaveAdminApi.createEmployeeType(payload);
      toast.success(editing ? "Employee type updated" : "Employee type created");
      setForm(null);
      qc.invalidateQueries({ queryKey: ["leave-admin"] });
      qc.invalidateQueries({ queryKey: ["leave"] });
    } catch (e) {
      toast.error("Could not save employee type", { description: errorText(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="h-fit rounded-xl border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <p className="text-sm font-semibold">Employee Types</p>
        <Button size="sm" variant="outline" onClick={() => open()}><Plus className="size-4" /> Add</Button>
      </div>
      {q.isLoading ? <Loader2 className="mx-auto my-8 size-5 animate-spin" /> : q.isError ? <EmptyState title="Could not load" description={errorText(q.error)} /> : !q.data?.length ? (
        <EmptyState title="No employee types" description="Create types such as Permanent, Probation, Contract or Intern." action={<Button onClick={() => open()}>Create type</Button>} />
      ) : (
        <ul className="divide-y">
          {q.data.map((t) => (
            <li key={t.id} className={cn("flex items-center gap-3 px-4 py-2.5", !t.is_active && "opacity-60")}>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{t.name} {t.code && <span className="text-xs text-muted-foreground">({t.code})</span>}</p>
                <p className="truncate text-xs text-muted-foreground">{t.employee_count} employee(s){t.is_active ? "" : " - inactive"}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => open(t)} aria-label={`Edit ${t.name}`}><Pencil className="size-4" /></Button>
            </li>
          ))}
        </ul>
      )}
      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit employee type" : "New employee type"}</DialogTitle></DialogHeader>
          {form && (
            <div className="space-y-3">
              <div className="space-y-1"><Label className="text-xs">Name *</Label><Input value={form.name} maxLength={60} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Permanent" /></div>
              <div className="space-y-1"><Label className="text-xs">Code</Label><Input value={form.code} maxLength={20} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">Description</Label><Textarea rows={2} maxLength={300} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <label className="flex items-center justify-between rounded-md border p-2.5 text-sm">
                Active <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setForm(null)} disabled={busy}>Cancel</Button>
            <Button className="bg-navy text-navy-foreground hover:bg-navy/90" onClick={save} disabled={busy}>{busy && <Loader2 className="size-4 animate-spin" />} Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmployeesPanel() {
  const qc = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [department, setDepartment] = useState<string | undefined>();
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkType, setBulkType] = useState("");
  const [editing, setEditing] = useState<EmployeeBrief | null>(null);
  const pageSize = 25;

  const typesQ = useQuery({ queryKey: ["leave-admin", "employee-types"], queryFn: () => leaveAdminApi.employeeTypes(false) });
  const deptQ = useQuery({ queryKey: ["leave-admin", "departments"], queryFn: leaveAdminApi.departments });
  const params = {
    search: term || undefined, department_id: department, page, page_size: pageSize,
    ...(typeFilter === UNASSIGNED ? { unassigned: true } : { employee_type_id: typeFilter }),
  };
  const q = useQuery({ queryKey: ["leave-admin", "employees", params], queryFn: () => leaveAdminApi.employees(params) });
  const rows = q.data?.items ?? [];
  const allState = rows.length && rows.every((r) => selected.has(r.id)) ? true : rows.some((r) => selected.has(r.id)) ? "indeterminate" : false;
  const typeOptions = [{ id: UNASSIGNED, name: "Not assigned" }, ...(typesQ.data ?? [])];

  const bulkAssign = async () => {
    if (!bulkType || !selected.size) return;
    const name = typesQ.data?.find((t) => t.id === bulkType)?.name;
    if (!window.confirm(`Change the employee type of ${selected.size} employee(s) to ${name}? Their leave eligibility follows the new type's mapping.`)) return;
    try {
      const r = await leaveAdminApi.assignType([...selected], bulkType);
      toast.success(`${r.updated} employee(s) updated`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["leave-admin"] });
      qc.invalidateQueries({ queryKey: ["leave"] });
    } catch (e) {
      toast.error("Could not assign type", { description: errorText(e) });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4 shadow-sm">
        <form className="space-y-1" onSubmit={(e) => { e.preventDefault(); setPage(1); setTerm(search.trim()); }}>
          <Label className="text-xs text-muted-foreground">Search</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} onBlur={() => { setPage(1); setTerm(search.trim()); }} placeholder="Name, ID or email" className="w-56 pl-8" />
          </div>
        </form>
        <FilterSelect label="Employee type" value={typeFilter} onChange={(v) => { setPage(1); setTypeFilter(v); }} options={typeOptions} allLabel="All types" />
        <FilterSelect label="Department" value={department} onChange={(v) => { setPage(1); setDepartment(v); }} options={deptQ.data ?? []} allLabel="All departments" />
      </div>
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-navy/30 bg-navy/5 px-4 py-2.5 text-sm">
          <span className="font-medium">{selected.size} selected</span>
          <Select value={bulkType} onValueChange={setBulkType}>
            <SelectTrigger className="h-8 w-48"><SelectValue placeholder="Assign employee type" /></SelectTrigger>
            <SelectContent>{(typesQ.data ?? []).map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
          </Select>
          <Button size="sm" className="bg-navy text-navy-foreground hover:bg-navy/90" disabled={!bulkType} onClick={bulkAssign}>Assign</Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
        </div>
      )}
      <div className="rounded-xl border bg-card shadow-sm">
        {q.isLoading ? <Loader2 className="mx-auto my-10 size-5 animate-spin" /> : q.isError ? <EmptyState title="Could not load employees" description={errorText(q.error)} /> : !rows.length ? <EmptyState title="No employees found" /> : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <TriCheckbox checked={allState} aria-label="Select page" onCheckedChange={(v) => {
                      const n = new Set(selected);
                      rows.forEach((r) => (v ? n.add(r.id) : n.delete(r.id)));
                      setSelected(n);
                    }} />
                  </TableHead>
                  <TableHead>Employee</TableHead><TableHead>Department</TableHead><TableHead>Employee Type</TableHead>
                  <TableHead>Reporting Manager</TableHead><TableHead>Joined</TableHead><TableHead>Probation ends</TableHead><TableHead>Location</TableHead><TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>
                      <Checkbox checked={selected.has(e.id)} aria-label={`Select ${e.name}`} onCheckedChange={(v) => {
                        const n = new Set(selected);
                        if (v) n.add(e.id); else n.delete(e.id);
                        setSelected(n);
                      }} />
                    </TableCell>
                    <TableCell><p className="font-medium">{e.name}</p><p className="text-xs text-muted-foreground">{e.employee_id || e.email}</p></TableCell>
                    <TableCell>{e.department || "-"}</TableCell>
                    <TableCell>{e.employee_type ? e.employee_type : <Badge variant="outline" className="text-amber-700">Not assigned</Badge>}</TableCell>
                    <TableCell>{e.reporting_manager || "-"}</TableCell>
                    <TableCell>{fmtDate(e.date_of_joining)}</TableCell>
                    <TableCell>{fmtDate(e.probation_end_date)}</TableCell>
                    <TableCell>{e.location || "-"}</TableCell>
                    <TableCell><Button size="sm" variant="ghost" onClick={() => setEditing(e)}><Pencil className="size-4" /> Edit</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {q.data && <Pager page={page} pageSize={pageSize} total={q.data.total} onPage={setPage} />}
      </div>
      {editing && <ProfileDialog employee={editing} employeeTypes={typesQ.data ?? []} onClose={() => setEditing(null)} />}
    </div>
  );
}

function ProfileDialog({ employee, employeeTypes, onClose }: { employee: EmployeeBrief; employeeTypes: EmployeeType[]; onClose: () => void }) {
  const qc = useQueryClient();
  const allQ = useQuery({ queryKey: ["leave-admin", "employees", "all"], queryFn: () => leaveAdminApi.employees({ page_size: 2000 }) });
  const shiftsQ = useQuery({ queryKey: ["leave-admin", "shift-policies"], queryFn: leaveAdminApi.shiftPolicies });
  const [form, setForm] = useState({
    employee_type_id: employee.employee_type_id ?? NONE,
    reporting_manager_id: employee.reporting_manager_id ?? NONE,
    date_of_joining: employee.date_of_joining ?? "",
    probation_end_date: employee.probation_end_date ?? "",
    location: employee.location ?? "",
    policy_id: employee.policy_id ?? NONE,
  });
  const [busy, setBusy] = useState(false);
  const pick = (v: string) => (v === NONE ? null : v);

  const save = async () => {
    if (form.date_of_joining && form.probation_end_date && form.probation_end_date < form.date_of_joining) { toast.error("Probation end date must be after the joining date"); return; }
    setBusy(true);
    try {
      await leaveAdminApi.updateProfile(employee.id, {
        employee_type_id: pick(form.employee_type_id), reporting_manager_id: pick(form.reporting_manager_id),
        date_of_joining: form.date_of_joining || null, probation_end_date: form.probation_end_date || null,
        location: form.location.trim() || null, policy_id: pick(form.policy_id),
      });
      toast.success(`${employee.name} updated`);
      qc.invalidateQueries({ queryKey: ["leave-admin"] });
      qc.invalidateQueries({ queryKey: ["leave"] });
      onClose();
    } catch (e) {
      toast.error("Could not update employee", { description: errorText(e) });
    } finally {
      setBusy(false);
    }
  };

  const managers = (allQ.data?.items ?? []).filter((m) => m.id !== employee.id);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{employee.name}{employee.employee_id ? ` (${employee.employee_id})` : ""}</DialogTitle></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">Employee type</Label>
            <Select value={form.employee_type_id} onValueChange={(v) => setForm({ ...form, employee_type_id: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Not assigned</SelectItem>
                {employeeTypes.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Reporting manager</Label>
            <Select value={form.reporting_manager_id} onValueChange={(v) => setForm({ ...form, reporting_manager_id: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value={NONE}>None</SelectItem>
                {managers.map((m) => <SelectItem key={m.id} value={m.id}>{m.employee_id ? `${m.employee_id} - ` : ""}{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label className="text-xs">Date of joining</Label><Input type="date" value={form.date_of_joining} onChange={(e) => setForm({ ...form, date_of_joining: e.target.value })} /></div>
          <div className="space-y-1"><Label className="text-xs">Probation end date</Label><Input type="date" value={form.probation_end_date} onChange={(e) => setForm({ ...form, probation_end_date: e.target.value })} /></div>
          <div className="space-y-1"><Label className="text-xs">Location</Label><Input value={form.location} maxLength={80} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Used for location-wise holidays" /></div>
          <div className="space-y-1">
            <Label className="text-xs">Shift / attendance policy</Label>
            <Select value={form.policy_id} onValueChange={(v) => setForm({ ...form, policy_id: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Default</SelectItem>
                {(shiftsQ.data ?? []).map((s) => <SelectItem key={s.id} value={s.id}>{s.name} ({s.start_time}-{s.end_time})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Changing the employee type changes which leave types the employee can apply for (individual overrides still apply). The change is kept in history.</p>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button className="bg-navy text-navy-foreground hover:bg-navy/90" onClick={save} disabled={busy}>{busy && <Loader2 className="size-4 animate-spin" />} Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
