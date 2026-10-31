import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, ScrollText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { leaveAdminApi, leaveApi, type LeavePolicy, type LeavePolicyPayload } from "@/api/leave";
import { DEFAULT_RULES, RulesFields, SwitchField, pickRules } from "@/components/leave/RulesFields";
import { EmptyState, PageTitle, WEEKDAYS, errorText, fmtDays } from "@/components/leave/leave-ui";

export const Route = createFileRoute("/leave/admin/policies")({
  head: () => ({ meta: [{ title: "Leave Policies" }] }),
  component: PoliciesPage,
});

const ALL_TYPES = "__all__";
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function GlobalSettings() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["leave", "settings"], queryFn: leaveApi.settings });
  const [offs, setOffs] = useState<number[]>([]);
  const [startMonth, setStartMonth] = useState(1);
  const [countPending, setCountPending] = useState(true);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (q.data) {
      setOffs(q.data.weekly_offs);
      setStartMonth(q.data.leave_year_start_month);
      setCountPending(q.data.count_pending_against_balance);
    }
  }, [q.data]);

  const save = async () => {
    if (offs.length >= 7) { toast.error("At least one working day is required"); return; }
    setBusy(true);
    try {
      await leaveAdminApi.saveSettings({ weekly_offs: offs, leave_year_start_month: startMonth, count_pending_against_balance: countPending });
      toast.success("Leave settings saved");
      qc.invalidateQueries({ queryKey: ["leave"] });
    } catch (e) {
      toast.error("Could not save settings", { description: errorText(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <p className="mb-3 text-sm font-semibold">Organisation-wide settings</p>
      <div className="grid gap-4 lg:grid-cols-[1fr_220px_1fr_auto] lg:items-end">
        <div className="space-y-1">
          <Label className="text-xs">Weekly offs</Label>
          <div className="flex flex-wrap gap-3">
            {WEEKDAYS.map((d, i) => (
              <label key={d} className="flex items-center gap-1.5 text-sm">
                <Checkbox checked={offs.includes(i)} onCheckedChange={(v) => setOffs((o) => (v ? [...o, i] : o.filter((x) => x !== i)).sort())} />
                {d.slice(0, 3)}
              </label>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Leave year starts in</Label>
          <Select value={String(startMonth)} onValueChange={(v) => setStartMonth(Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <SwitchField label="Reserve pending days" checked={countPending} onChange={setCountPending} hint="Pending requests reduce what can still be applied (not the booked balance)" />
        <Button className="bg-navy text-navy-foreground hover:bg-navy/90" onClick={save} disabled={busy || q.isLoading}>{busy && <Loader2 className="size-4 animate-spin" />} Save settings</Button>
      </div>
    </div>
  );
}

function PoliciesPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["leave-admin", "policies"], queryFn: leaveAdminApi.policies });
  const ltQ = useQuery({ queryKey: ["leave-admin", "leave-types"], queryFn: () => leaveAdminApi.leaveTypes(true) });
  const etQ = useQuery({ queryKey: ["leave-admin", "employee-types"], queryFn: () => leaveAdminApi.employeeTypes(false) });
  const [editing, setEditing] = useState<LeavePolicy | null>(null);
  const [form, setForm] = useState<LeavePolicyPayload | null>(null);
  const [busy, setBusy] = useState(false);

  const open = (p?: LeavePolicy) => {
    setEditing(p ?? null);
    setForm(p ? { ...pickRules(p), leave_type_id: p.leave_type_id, employee_type_id: p.employee_type_id, name: p.name } : { ...DEFAULT_RULES, leave_type_id: "", employee_type_id: null });
  };

  const chooseLeaveType = (id: string) => {
    const lt = ltQ.data?.find((x) => x.id === id);
    // Start a new policy from the leave type's defaults.
    setForm((f) => f && { ...f, ...(editing || !lt ? {} : pickRules(lt)), leave_type_id: id });
  };

  const save = async () => {
    if (!form?.leave_type_id) { toast.error("Choose a leave type"); return; }
    setBusy(true);
    try {
      if (editing) await leaveAdminApi.updatePolicy(editing.id, form);
      else await leaveAdminApi.createPolicy(form);
      toast.success(editing ? "Policy updated" : "Policy created");
      setForm(null);
      qc.invalidateQueries({ queryKey: ["leave-admin"] });
      qc.invalidateQueries({ queryKey: ["leave"] });
    } catch (e) {
      toast.error("Could not save policy", { description: errorText(e) });
    } finally {
      setBusy(false);
    }
  };

  const deactivate = async (p: LeavePolicy) => {
    if (!window.confirm(`Deactivate the ${p.leave_type} policy for ${p.employee_type}? Employees will fall back to the leave type defaults.`)) return;
    try {
      await leaveAdminApi.deactivatePolicy(p.id);
      toast.success("Policy deactivated");
      qc.invalidateQueries({ queryKey: ["leave-admin"] });
    } catch (e) {
      toast.error("Could not deactivate", { description: errorText(e) });
    }
  };

  return (
    <div className="space-y-4">
      <PageTitle icon={<ScrollText className="size-6" />} title="Leave Policies"
        subtitle="Rules applied in order: leave type default, then an all-types policy, then an employee-type policy."
        actions={<Button className="bg-navy text-navy-foreground hover:bg-navy/90" onClick={() => open()}><Plus className="size-4" /> New policy</Button>} />
      <GlobalSettings />
      <div className="rounded-xl border bg-card shadow-sm">
        {q.isLoading ? <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
          : q.isError ? <EmptyState title="Could not load policies" description={errorText(q.error)} />
          : !q.data?.length ? <EmptyState title="No policies" description="Without a policy each leave type uses its own default rules." />
          : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Leave Type</TableHead><TableHead>Applies To</TableHead><TableHead>Entitlement</TableHead><TableHead>Accrual</TableHead>
                    <TableHead>Carry forward</TableHead><TableHead>Probation</TableHead><TableHead>Negative</TableHead><TableHead>Half day</TableHead><TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {q.data.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.leave_type}</TableCell>
                      <TableCell>{p.employee_type}</TableCell>
                      <TableCell>{fmtDays(p.annual_entitlement)} / year</TableCell>
                      <TableCell className="capitalize">{p.accrual_frequency}</TableCell>
                      <TableCell>{p.carry_forward ? (p.max_carry_forward ? `Up to ${fmtDays(p.max_carry_forward)}` : "Unlimited") : "No"}</TableCell>
                      <TableCell>{p.allow_during_probation ? "Allowed" : "Not allowed"}</TableCell>
                      <TableCell>{p.allow_negative_balance ? `Up to -${fmtDays(p.negative_balance_limit)}` : "No"}</TableCell>
                      <TableCell>{p.allow_half_day ? "Yes" : "No"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => open(p)}><Pencil className="size-4" /></Button>
                          <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => deactivate(p)} title="Deactivate"><Trash2 className="size-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
      </div>

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit policy" : "New leave policy"}</DialogTitle></DialogHeader>
          {form && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Leave type *</Label>
                  <Select value={form.leave_type_id} onValueChange={chooseLeaveType}>
                    <SelectTrigger><SelectValue placeholder="Select leave type" /></SelectTrigger>
                    <SelectContent>{(ltQ.data ?? []).filter((l) => !l.is_lwp).map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Employee type</Label>
                  <Select value={form.employee_type_id ?? ALL_TYPES} onValueChange={(v) => setForm((f) => f && { ...f, employee_type_id: v === ALL_TYPES ? null : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_TYPES}>All employee types</SelectItem>
                      {(etQ.data ?? []).map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <RulesFields value={pickRules(form)} onChange={(r) => setForm((f) => f && { ...f, ...r })} />
            </div>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setForm(null)} disabled={busy}>Cancel</Button>
            <Button className="bg-navy text-navy-foreground hover:bg-navy/90" onClick={save} disabled={busy}>{busy && <Loader2 className="size-4 animate-spin" />} Save policy</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
