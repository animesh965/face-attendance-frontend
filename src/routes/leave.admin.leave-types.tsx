import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Tags } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { leaveAdminApi, type LeaveType, type LeaveTypePayload } from "@/api/leave";
import { DEFAULT_RULES, NumberField, RulesFields, SwitchField, pickRules } from "@/components/leave/RulesFields";
import { EmptyState, LEAVE_ICONS, LeaveTypeIcon, PageTitle, errorText, fmtDays } from "@/components/leave/leave-ui";

export const Route = createFileRoute("/leave/admin/leave-types")({
  head: () => ({ meta: [{ title: "Leave Types" }] }),
  component: LeaveTypesPage,
});

const COLORS = ["#3b82f6", "#10b981", "#f43f5e", "#f59e0b", "#8b5cf6", "#06b6d4", "#ec4899", "#64748b", "#84cc16", "#f97316"];

const EMPTY: LeaveTypePayload = {
  ...DEFAULT_RULES, name: "", code: "", description: null, color: COLORS[0]!, icon: "calendar", is_paid: true, is_lwp: false,
  requires_document: false, document_required_after_days: 0, encashable: false, max_encashable_days: 0, is_active: true, sort_order: 0,
};

function LeaveTypesPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["leave-admin", "leave-types"], queryFn: () => leaveAdminApi.leaveTypes(true) });
  const [editing, setEditing] = useState<LeaveType | null>(null);
  const [form, setForm] = useState<LeaveTypePayload | null>(null);
  const [busy, setBusy] = useState(false);

  const open = (lt?: LeaveType) => {
    setEditing(lt ?? null);
    if (lt) {
      const { id, ...rest } = lt;
      void id;
      setForm({ ...EMPTY, ...rest, ...pickRules(rest) });
    } else setForm({ ...EMPTY, sort_order: (q.data?.length ?? 0) * 10 });
  };
  const set = <K extends keyof LeaveTypePayload>(k: K, v: LeaveTypePayload[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  const save = async () => {
    if (!form) return;
    if (form.name.trim().length < 2) { toast.error("Enter a leave type name"); return; }
    if (!form.code.trim()) { toast.error("Enter a leave code"); return; }
    if (form.max_days && form.max_days < form.min_days) { toast.error("Maximum duration must be at least the minimum"); return; }
    setBusy(true);
    try {
      const payload = { ...form, name: form.name.trim(), code: form.code.trim().toUpperCase(), description: form.description?.trim() || null };
      if (editing) await leaveAdminApi.updateLeaveType(editing.id, payload);
      else await leaveAdminApi.createLeaveType(payload);
      toast.success(editing ? "Leave type updated" : "Leave type created");
      setForm(null);
      qc.invalidateQueries({ queryKey: ["leave-admin"] });
      qc.invalidateQueries({ queryKey: ["leave"] });
    } catch (e) {
      toast.error("Could not save leave type", { description: errorText(e) });
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (lt: LeaveType) => {
    try {
      await leaveAdminApi.setLeaveTypeStatus(lt.id, !lt.is_active);
      toast.success(`${lt.name} ${lt.is_active ? "deactivated" : "activated"}`);
      qc.invalidateQueries({ queryKey: ["leave-admin"] });
      qc.invalidateQueries({ queryKey: ["leave"] });
    } catch (e) {
      toast.error("Could not update status", { description: errorText(e) });
    }
  };

  return (
    <div className="space-y-4">
      <PageTitle icon={<Tags className="size-6" />} title="Leave Types" subtitle="Define each leave type and its default rules. Policies can override the rules per employee type."
        actions={<Button className="bg-navy text-navy-foreground hover:bg-navy/90" onClick={() => open()}><Plus className="size-4" /> New leave type</Button>} />
      <div className="rounded-xl border bg-card shadow-sm">
        {q.isLoading ? <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
          : q.isError ? <EmptyState title="Could not load leave types" description={errorText(q.error)} />
          : !q.data?.length ? <EmptyState title="No leave types yet" description="Create leave types such as Casual Leave, Sick Leave or Leave Without Pay." action={<Button onClick={() => open()}>Create leave type</Button>} />
          : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Leave Type</TableHead><TableHead>Code</TableHead><TableHead>Pay</TableHead><TableHead>Annual</TableHead>
                    <TableHead>Accrual</TableHead><TableHead>Half day</TableHead><TableHead>Duration</TableHead><TableHead>Document</TableHead>
                    <TableHead>Carry fwd</TableHead><TableHead>Encash</TableHead><TableHead>Active</TableHead><TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {q.data.map((lt) => (
                    <TableRow key={lt.id} className={cn(!lt.is_active && "opacity-60")}>
                      <TableCell>
                        <span className="flex items-center gap-2"><LeaveTypeIcon icon={lt.icon} color={lt.color} className="size-8" /><span className="font-medium">{lt.name}</span></span>
                      </TableCell>
                      <TableCell><Badge variant="outline">{lt.code}</Badge></TableCell>
                      <TableCell>{lt.is_lwp ? <Badge variant="outline" className="text-rose-700">LWP</Badge> : lt.is_paid ? "Paid" : "Unpaid"}</TableCell>
                      <TableCell>{lt.is_lwp ? "-" : fmtDays(lt.annual_entitlement)}</TableCell>
                      <TableCell className="capitalize">{lt.accrual_frequency}</TableCell>
                      <TableCell>{lt.allow_half_day ? "Yes" : "No"}</TableCell>
                      <TableCell className="text-xs">{fmtDays(lt.min_days)} - {lt.max_days ? fmtDays(lt.max_days) : "no max"}</TableCell>
                      <TableCell>{lt.requires_document ? (lt.document_required_after_days ? `> ${fmtDays(lt.document_required_after_days)} d` : "Required") : "No"}</TableCell>
                      <TableCell>{lt.carry_forward ? (lt.max_carry_forward ? `Up to ${fmtDays(lt.max_carry_forward)}` : "Yes") : "No"}</TableCell>
                      <TableCell>{lt.encashable ? "Yes" : "No"}</TableCell>
                      <TableCell><Switch checked={lt.is_active} onCheckedChange={() => toggleActive(lt)} aria-label={`Toggle ${lt.name}`} /></TableCell>
                      <TableCell><Button size="sm" variant="ghost" onClick={() => open(lt)}><Pencil className="size-4" /> Edit</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
      </div>

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? `Edit ${editing.name}` : "New leave type"}</DialogTitle></DialogHeader>
          {form && (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1 sm:col-span-2"><Label className="text-xs">Name *</Label><Input value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={60} placeholder="e.g. Casual Leave" /></div>
                <div className="space-y-1"><Label className="text-xs">Code *</Label><Input value={form.code} onChange={(e) => set("code", e.target.value.toUpperCase())} maxLength={10} placeholder="CL" /></div>
                <div className="space-y-1 sm:col-span-3"><Label className="text-xs">Description</Label><Textarea rows={2} value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} maxLength={500} /></div>
                <div className="space-y-1">
                  <Label className="text-xs">Colour</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {COLORS.map((c) => (
                      <button key={c} type="button" aria-label={`Colour ${c}`} onClick={() => set("color", c)}
                        className={cn("size-6 rounded-full border-2", form.color === c ? "border-foreground" : "border-transparent")} style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs">Icon</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(LEAVE_ICONS).map(([name, Icon]) => (
                      <button key={name} type="button" aria-label={`Icon ${name}`} onClick={() => set("icon", name)}
                        className={cn("flex size-8 items-center justify-center rounded-md border", form.icon === name && "border-navy bg-navy/10 text-navy")}>
                        <Icon className="size-4" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <SwitchField label="Leave Without Pay type" checked={form.is_lwp} onChange={(v) => setForm((f) => f && { ...f, is_lwp: v, is_paid: v ? false : f.is_paid })} hint="Unpaid, no balance needed" />
                <SwitchField label="Paid leave" checked={form.is_paid && !form.is_lwp} onChange={(v) => set("is_paid", v)} />
                <NumberField label="Display order" value={form.sort_order} onChange={(v) => set("sort_order", v)} />
                <SwitchField label="Supporting document required" checked={form.requires_document} onChange={(v) => set("requires_document", v)} />
                <NumberField label="Document required above (days)" value={form.document_required_after_days} step={0.5} disabled={!form.requires_document} hint="0 = always" onChange={(v) => set("document_required_after_days", v)} />
                <span />
                <SwitchField label="Encashable" checked={form.encashable} onChange={(v) => set("encashable", v)} />
                <NumberField label="Max encashable days" value={form.max_encashable_days} step={0.5} disabled={!form.encashable} onChange={(v) => set("max_encashable_days", v)} />
              </div>
              <div className="rounded-lg border p-3">
                <p className="mb-3 text-xs text-muted-foreground">Default rules. Leave Policies can override these for all or specific employee types.</p>
                <RulesFields value={pickRules(form)} onChange={(r) => setForm((f) => f && { ...f, ...r })} />
              </div>
              <SwitchField label="Active" checked={form.is_active} onChange={(v) => set("is_active", v)} hint="Inactive leave types cannot be applied for and are hidden from mapping" />
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
