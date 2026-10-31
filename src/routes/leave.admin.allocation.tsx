import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Search, Wallet, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { leaveAdminApi, leaveApi, type CarryForwardRow, type EmployeeBrief } from "@/api/leave";
import { EmployeePicker } from "@/components/leave/EmployeePicker";
import { FilterSelect } from "@/components/leave/FilterSelect";
import { EmptyState, PageTitle, errorText, fmtDateTime, fmtDays } from "@/components/leave/leave-ui";

export const Route = createFileRoute("/leave/admin/allocation")({
  head: () => ({ meta: [{ title: "Leave Allocation" }] }),
  component: AllocationPage,
});

function useLookups() {
  const settingsQ = useQuery({ queryKey: ["leave", "settings"], queryFn: leaveApi.settings });
  const ltQ = useQuery({ queryKey: ["leave-admin", "leave-types"], queryFn: () => leaveAdminApi.leaveTypes(true) });
  const etQ = useQuery({ queryKey: ["leave-admin", "employee-types"], queryFn: () => leaveAdminApi.employeeTypes(false) });
  const empQ = useQuery({ queryKey: ["leave-admin", "employees", "all"], queryFn: () => leaveAdminApi.employees({ page_size: 2000 }) });
  return {
    year: settingsQ.data?.current_year ?? new Date().getFullYear(),
    leaveTypes: (ltQ.data ?? []).filter((l) => l.is_active && !l.is_lwp),
    employeeTypes: etQ.data ?? [],
    employees: empQ.data?.items ?? [],
  };
}

function YearInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">Leave year</Label>
      <Input type="number" min={2000} max={2100} value={value} onChange={(e) => onChange(Number(e.target.value) || value)} className="w-28" />
    </div>
  );
}

function AllocationPage() {
  const { year: currentYear } = useLookups();
  const [year, setYear] = useState<number | null>(null);
  const y = year ?? currentYear;
  return (
    <div className="space-y-4">
      <PageTitle icon={<Wallet className="size-6" />} title="Leave Allocation"
        subtitle="How many days employees receive. Priority: individual allocation, then employee-type allocation, then the leave policy entitlement." />
      <Tabs defaultValue="allocate">
        <TabsList className="flex h-auto flex-wrap justify-start">
          <TabsTrigger value="allocate">Allocate</TabsTrigger>
          <TabsTrigger value="adjust">Adjust / Opening balance</TabsTrigger>
          <TabsTrigger value="balances">Balances</TabsTrigger>
          <TabsTrigger value="yearend">Carry forward</TabsTrigger>
        </TabsList>
        <TabsContent value="allocate"><AllocateTab year={y} setYear={setYear} /></TabsContent>
        <TabsContent value="adjust"><AdjustTab year={y} setYear={setYear} /></TabsContent>
        <TabsContent value="balances"><BalancesTab year={y} setYear={setYear} /></TabsContent>
        <TabsContent value="yearend"><YearEndTab year={y} setYear={setYear} /></TabsContent>
      </Tabs>
    </div>
  );
}

type TabProps = { year: number; setYear: (y: number) => void };

function AllocateTab({ year, setYear }: TabProps) {
  const qc = useQueryClient();
  const { leaveTypes, employeeTypes, employees } = useLookups();
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [days, setDays] = useState(12);
  const [target, setTarget] = useState<"type" | "employees">("type");
  const [typeId, setTypeId] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const listQ = useQuery({ queryKey: ["leave-admin", "allocations", year], queryFn: () => leaveAdminApi.allocations(year) });

  const save = async () => {
    if (!leaveTypeId) { toast.error("Choose a leave type"); return; }
    if (days < 0 || days > 366 || Math.round(days * 2) !== days * 2) { toast.error("Days must be between 0 and 366 in steps of 0.5"); return; }
    if (target === "type" && !typeId) { toast.error("Choose an employee type"); return; }
    if (target === "employees" && !selected.size) { toast.error("Select at least one employee"); return; }
    setBusy(true);
    try {
      const r = await leaveAdminApi.saveAllocation({
        leave_type_id: leaveTypeId, year, days, note: note.trim() || null,
        ...(target === "type" ? { employee_type_id: typeId } : { employee_ids: [...selected] }),
      });
      toast.success(`Allocation saved for ${r.saved} ${target === "type" ? "employee type" : "employee(s)"}`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["leave-admin"] });
      qc.invalidateQueries({ queryKey: ["leave"] });
    } catch (e) {
      toast.error("Could not save allocation", { description: errorText(e) });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await leaveAdminApi.removeAllocation(id);
      toast.success("Allocation removed; the policy entitlement applies again");
      qc.invalidateQueries({ queryKey: ["leave-admin"] });
    } catch (e) {
      toast.error("Could not remove", { description: errorText(e) });
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,420px)_1fr]">
      <div className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <YearInput value={year} onChange={setYear} />
          <div className="min-w-44 flex-1 space-y-1">
            <Label className="text-xs">Leave type</Label>
            <Select value={leaveTypeId} onValueChange={setLeaveTypeId}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{leaveTypes.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Days per year</Label>
            <Input type="number" step={0.5} min={0} max={366} value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-24" />
          </div>
        </div>
        <RadioGroup value={target} onValueChange={(v) => setTarget(v as "type" | "employees")} className="flex gap-4">
          <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="type" /> Employee type wise</label>
          <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="employees" /> Individual / bulk</label>
        </RadioGroup>
        {target === "type" ? (
          <Select value={typeId} onValueChange={setTypeId}>
            <SelectTrigger><SelectValue placeholder="Select employee type" /></SelectTrigger>
            <SelectContent>{employeeTypes.map((t) => <SelectItem key={t.id} value={t.id}>{t.name} ({t.employee_count})</SelectItem>)}</SelectContent>
          </Select>
        ) : (
          <EmployeePicker employees={employees} employeeTypes={employeeTypes} selected={selected} onChange={setSelected} />
        )}
        <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" maxLength={300} />
        <p className="text-xs text-muted-foreground">Allocation sets entitlement only. Employees must still be mapped to the leave type to use it.</p>
        <div className="flex justify-end"><Button className="bg-navy text-navy-foreground hover:bg-navy/90" onClick={save} disabled={busy}>{busy && <Loader2 className="size-4 animate-spin" />} Save allocation</Button></div>
      </div>
      <div className="rounded-xl border bg-card shadow-sm">
        <p className="border-b px-4 py-3 text-sm font-semibold">Allocations for {year}</p>
        {listQ.isLoading ? <Loader2 className="mx-auto my-8 size-5 animate-spin" /> : !listQ.data?.length ? (
          <EmptyState title="No explicit allocations" description="Employees receive the annual entitlement from their leave policy." />
        ) : (
          <div className="max-h-[560px] overflow-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Applies to</TableHead><TableHead>Leave Type</TableHead><TableHead>Days</TableHead><TableHead>Updated</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {listQ.data.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{a.scope === "employee_type" ? <b>{a.employee_type} (type)</b> : `${a.employee_code ? a.employee_code + " - " : ""}${a.employee}`}</TableCell>
                    <TableCell>{a.leave_type}</TableCell>
                    <TableCell>{fmtDays(a.days)}</TableCell>
                    <TableCell className="text-xs">{fmtDateTime(a.updated_at)}<br />{a.updated_by}</TableCell>
                    <TableCell><Button size="sm" variant="ghost" onClick={() => remove(a.id)} title="Remove"><X className="size-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

function AdjustTab({ year, setYear }: TabProps) {
  const qc = useQueryClient();
  const { leaveTypes, employeeTypes, employees } = useLookups();
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [kind, setKind] = useState<"adjustment" | "opening" | "carry_forward">("adjustment");
  const [days, setDays] = useState(1);
  const [reason, setReason] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const listQ = useQuery({ queryKey: ["leave-admin", "adjustments", year], queryFn: () => leaveAdminApi.adjustments(year) });

  const save = async () => {
    if (!leaveTypeId) { toast.error("Choose a leave type"); return; }
    if (!selected.size) { toast.error("Select at least one employee"); return; }
    if (!days || Math.round(days * 2) !== days * 2) { toast.error("Days must be non-zero, in steps of 0.5"); return; }
    if (reason.trim().length < 3) { toast.error("Enter a reason"); return; }
    if (!window.confirm(`Apply ${days > 0 ? "+" : ""}${days} day(s) to ${selected.size} employee(s)? This is recorded in the balance ledger.`)) return;
    setBusy(true);
    try {
      const r = await leaveAdminApi.adjust({ employee_ids: [...selected], leave_type_id: leaveTypeId, year, kind, days, reason: reason.trim() });
      toast.success(`Balance updated for ${r.adjusted} employee(s)`);
      setSelected(new Set());
      setReason("");
      qc.invalidateQueries({ queryKey: ["leave-admin"] });
      qc.invalidateQueries({ queryKey: ["leave"] });
    } catch (e) {
      toast.error("Could not adjust balance", { description: errorText(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,420px)_1fr]">
      <div className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <YearInput value={year} onChange={setYear} />
          <div className="min-w-44 flex-1 space-y-1">
            <Label className="text-xs">Leave type</Label>
            <Select value={leaveTypeId} onValueChange={setLeaveTypeId}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{leaveTypes.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="min-w-44 flex-1 space-y-1">
            <Label className="text-xs">Type</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as typeof kind)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="adjustment">Manual adjustment</SelectItem>
                <SelectItem value="opening">Opening balance</SelectItem>
                <SelectItem value="carry_forward">Carry-forward balance</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Days (+ credit / - debit)</Label>
            <Input type="number" step={0.5} value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-28" />
          </div>
        </div>
        <EmployeePicker employees={employees} employeeTypes={employeeTypes} selected={selected} onChange={setSelected} height="h-52" />
        <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (required, visible to the employee)" maxLength={300} />
        <div className="flex justify-end"><Button className="bg-navy text-navy-foreground hover:bg-navy/90" onClick={save} disabled={busy}>{busy && <Loader2 className="size-4 animate-spin" />} Apply</Button></div>
      </div>
      <div className="rounded-xl border bg-card shadow-sm">
        <p className="border-b px-4 py-3 text-sm font-semibold">Adjustments in {year}</p>
        {listQ.isLoading ? <Loader2 className="mx-auto my-8 size-5 animate-spin" /> : !listQ.data?.length ? <EmptyState title="No adjustments" /> : (
          <div className="max-h-[560px] overflow-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Leave Type</TableHead><TableHead>Type</TableHead><TableHead>Days</TableHead><TableHead>Reason</TableHead><TableHead>By</TableHead></TableRow></TableHeader>
              <TableBody>
                {listQ.data.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{a.employee_code ? `${a.employee_code} - ` : ""}{a.employee}</TableCell>
                    <TableCell>{a.leave_type}</TableCell>
                    <TableCell className="capitalize">{a.kind.replace("_", " ")}</TableCell>
                    <TableCell className={a.days > 0 ? "text-emerald-600" : "text-rose-600"}>{a.days > 0 ? "+" : ""}{fmtDays(a.days)}</TableCell>
                    <TableCell className="max-w-56 truncate" title={a.reason}>{a.reason}</TableCell>
                    <TableCell className="text-xs">{a.created_by}<br />{fmtDateTime(a.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

function BalancesTab({ year, setYear }: TabProps) {
  const { employeeTypes } = useLookups();
  const [typeId, setTypeId] = useState<string | undefined>();
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [ledgerFor, setLedgerFor] = useState<EmployeeBrief | null>(null);
  const q = useQuery({ queryKey: ["leave-admin", "balances", year, typeId, term], queryFn: () => leaveAdminApi.balances({ year, employee_type_id: typeId, search: term || undefined }) });
  const ledgerQ = useQuery({ queryKey: ["leave-admin", "transactions", ledgerFor?.id, year], queryFn: () => leaveAdminApi.transactions(ledgerFor!.id, year), enabled: !!ledgerFor });
  const types = [...new Map((q.data?.items ?? []).flatMap((i) => i.balances.map((b) => [b.leave_type_id, b.name] as const))).entries()];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4 shadow-sm">
        <YearInput value={year} onChange={setYear} />
        <FilterSelect label="Employee type" value={typeId} onChange={setTypeId} options={employeeTypes} allLabel="All employee types" />
        <form className="space-y-1" onSubmit={(e) => { e.preventDefault(); setTerm(search.trim()); }}>
          <Label className="text-xs text-muted-foreground">Search</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} onBlur={() => setTerm(search.trim())} placeholder="Name or ID" className="w-56 pl-8" />
          </div>
        </form>
      </div>
      <div className="rounded-xl border bg-card shadow-sm">
        {q.isLoading ? <Loader2 className="mx-auto my-8 size-5 animate-spin" /> : q.isError ? <EmptyState title="Could not load" description={errorText(q.error)} /> : !q.data?.items.length ? <EmptyState /> : (
          <div className="max-h-[640px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead><TableHead>Type</TableHead>
                  {types.map(([id, name]) => <TableHead key={id} className="text-center">{name}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {q.data.items.map(({ employee, balances }) => (
                  <TableRow key={employee.id} className="cursor-pointer" onClick={() => setLedgerFor(employee)}>
                    <TableCell className="font-medium">{employee.employee_id ? `${employee.employee_id} - ` : ""}{employee.name}</TableCell>
                    <TableCell>{employee.employee_type || "-"}</TableCell>
                    {types.map(([id]) => {
                      const b = balances.find((x) => x.leave_type_id === id);
                      return (
                        <TableCell key={id} className="text-center text-xs">
                          {!b ? <span className="text-muted-foreground">n/a</span> : b.is_lwp ? `${fmtDays(b.booked)} used` : (
                            <><b className="text-sm">{fmtDays(b.available)}</b><span className="block text-muted-foreground">{fmtDays(b.booked)} booked{b.pending ? `, ${fmtDays(b.pending)} pending` : ""}</span></>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
      <Dialog open={!!ledgerFor} onOpenChange={(o) => !o && setLedgerFor(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Balance ledger - {ledgerFor?.name} ({year})</DialogTitle></DialogHeader>
          <div className="max-h-[60vh] overflow-auto">
            {ledgerQ.isLoading ? <Loader2 className="mx-auto size-5 animate-spin" /> : !ledgerQ.data?.length ? <EmptyState title="No transactions" description="Only allocations from policy apply." /> : (
              <Table>
                <TableHeader><TableRow><TableHead>When</TableHead><TableHead>Leave Type</TableHead><TableHead>Entry</TableHead><TableHead>Days</TableHead><TableHead>Note</TableHead></TableRow></TableHeader>
                <TableBody>
                  {ledgerQ.data.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-xs">{fmtDateTime(t.created_at)}</TableCell>
                      <TableCell>{t.leave_type}</TableCell>
                      <TableCell className="capitalize">{t.kind.replace("_", " ")}</TableCell>
                      <TableCell className={t.days > 0 ? "text-emerald-600" : "text-rose-600"}>{t.days > 0 ? "+" : ""}{fmtDays(t.days)}</TableCell>
                      <TableCell className="text-xs">{t.note}{t.created_by ? ` (${t.created_by})` : ""}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function YearEndTab({ year, setYear }: TabProps) {
  const qc = useQueryClient();
  const [preview, setPreview] = useState<{ kind: "carry" | "lapse"; rows: CarryForwardRow[] } | null>(null);
  const [busy, setBusy] = useState("");
  const fromYear = year - 1;

  const run = async (kind: "carry" | "lapse", dryRun: boolean) => {
    setBusy(`${kind}-${dryRun}`);
    try {
      const r = kind === "carry" ? await leaveAdminApi.carryForward(fromYear, dryRun) : await leaveAdminApi.lapse(year, dryRun);
      if (dryRun) setPreview({ kind, rows: r.rows });
      else {
        toast.success(kind === "carry" ? `Carried forward for ${r.posted} balance(s)` : `Lapsed ${r.posted} balance(s)`, { description: r.posted === 0 ? "Already processed earlier - nothing new to post." : undefined });
        setPreview(null);
        qc.invalidateQueries({ queryKey: ["leave-admin"] });
        qc.invalidateQueries({ queryKey: ["leave"] });
      }
    } catch (e) {
      toast.error("Could not process", { description: errorText(e) });
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm font-semibold">Carry forward {fromYear} to {year}</p>
          <p className="text-xs text-muted-foreground">Moves unused balance of carry-forward-enabled leave types into {year}, capped by each policy. Safe to run again: each balance is carried only once.</p>
          <div className="flex items-end gap-2">
            <YearInput value={year} onChange={setYear} />
            <Button variant="outline" onClick={() => run("carry", true)} disabled={!!busy}>{busy === "carry-true" && <Loader2 className="size-4 animate-spin" />} Preview</Button>
          </div>
        </div>
        <div className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm font-semibold">Expire carried-forward days in {year}</p>
          <p className="text-xs text-muted-foreground">Removes carried-forward days that were not used within the expiry period set in the policy. Carried days are treated as used first.</p>
          <Button variant="outline" onClick={() => run("lapse", true)} disabled={!!busy}>{busy === "lapse-true" && <Loader2 className="size-4 animate-spin" />} Preview</Button>
        </div>
      </div>
      {preview && (
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <p className="text-sm font-semibold">{preview.kind === "carry" ? "Carry forward preview" : "Expiry preview"} ({preview.rows.length})</p>
            {preview.rows.length > 0 && (
              <Button className="bg-navy text-navy-foreground hover:bg-navy/90" disabled={!!busy} onClick={() => run(preview.kind, false)}>
                {busy.endsWith("false") && <Loader2 className="size-4 animate-spin" />} Confirm and post
              </Button>
            )}
          </div>
          {!preview.rows.length ? <EmptyState title="Nothing to process" /> : (
            <div className="max-h-96 overflow-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Leave Type</TableHead>{preview.kind === "carry" ? <><TableHead>Unused</TableHead><TableHead>Carry forward</TableHead></> : <><TableHead>Lapse</TableHead><TableHead>Expired on</TableHead></>}</TableRow></TableHeader>
                <TableBody>
                  {preview.rows.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell>{r.employee_code ? `${r.employee_code} - ` : ""}{r.employee}</TableCell>
                      <TableCell>{r.leave_type}</TableCell>
                      {preview.kind === "carry" ? <><TableCell>{fmtDays(r.available)}</TableCell><TableCell className="font-semibold">{fmtDays(r.carry_forward)}</TableCell></>
                        : <><TableCell className="text-rose-600">-{fmtDays(r.lapse)}</TableCell><TableCell>{r.expired_on}</TableCell></>}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
