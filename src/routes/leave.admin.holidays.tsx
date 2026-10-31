import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarHeart, ChevronLeft, ChevronRight, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/api/client";
import { holidaysApi, type Holiday, type HolidayPayload } from "@/api/holiday";
import { leaveAdminApi } from "@/api/leave";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, PageTitle, errorText, fmtDate } from "@/components/leave/leave-ui";

export const Route = createFileRoute("/leave/admin/holidays")({
  head: () => ({ meta: [{ title: "Holiday Management" }] }),
  component: HolidayAdminPage,
});

const HOLIDAY_TYPES = [
  { value: "public", label: "Public" },
  { value: "company", label: "Company" },
  { value: "optional", label: "Optional" },
];

type Form = HolidayPayload & { employee_type_ids: string[]; department_ids: string[]; locations: string[] };

const emptyForm = (year: number): Form => ({
  name: "", from_date: `${year}-01-01`, to_date: `${year}-01-01`, description: null, holiday_type: "public",
  employee_type_ids: [], department_ids: [], locations: [],
});

function ScopeList({ label, options, value, onChange }: { label: string; options: { id: string; name: string }[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="h-36 overflow-y-auto rounded-md border p-1">
        {!options.length ? <p className="p-2 text-xs text-muted-foreground">None defined</p> : options.map((o) => (
          <label key={o.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted/50">
            <Checkbox checked={value.includes(o.id)} onCheckedChange={(v) => onChange(v ? [...value, o.id] : value.filter((x) => x !== o.id))} />
            <span className="truncate">{o.name}</span>
          </label>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">{value.length ? `${value.length} selected` : "None selected = everyone"}</p>
    </div>
  );
}

function HolidayAdminPage() {
  const qc = useQueryClient();
  const [year, setYear] = useState(new Date().getFullYear());
  const [editing, setEditing] = useState<Holiday | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);

  const q = useQuery({
    queryKey: ["holidays", "admin", year],
    queryFn: async () => (await api.get<Holiday[]>("/api/v1/holidays", { params: { from_date: `${year}-01-01`, to_date: `${year}-12-31` } })).data,
  });
  const typesQ = useQuery({ queryKey: ["leave-admin", "employee-types"], queryFn: () => leaveAdminApi.employeeTypes(false) });
  const deptQ = useQuery({ queryKey: ["leave-admin", "departments"], queryFn: leaveAdminApi.departments });
  const empQ = useQuery({ queryKey: ["leave-admin", "employees", "all"], queryFn: () => leaveAdminApi.employees({ page_size: 2000 }) });

  const typeNames = useMemo(() => new Map((typesQ.data ?? []).map((t) => [t.id, t.name])), [typesQ.data]);
  const deptNames = useMemo(() => new Map((deptQ.data ?? []).map((d) => [d.id, d.name])), [deptQ.data]);
  const locations = useMemo(() => {
    const set = new Set((empQ.data?.items ?? []).map((e) => e.location).filter(Boolean));
    for (const h of q.data ?? []) for (const l of h.locations ?? []) set.add(l);
    return [...set].sort().map((l) => ({ id: l, name: l }));
  }, [empQ.data, q.data]);

  const open = (h?: Holiday) => {
    setEditing(h ?? null);
    setForm(h ? {
      name: h.name, from_date: h.from_date.slice(0, 10), to_date: h.to_date.slice(0, 10), description: h.description ?? null, holiday_type: h.holiday_type,
      employee_type_ids: h.employee_type_ids ?? [], department_ids: h.department_ids ?? [], locations: h.locations ?? [],
    } : emptyForm(year));
  };

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["holidays"] });
    qc.invalidateQueries({ queryKey: ["leave"] });
  };

  const save = async () => {
    if (!form) return;
    if (form.name.trim().length < 2) { toast.error("Enter a holiday name"); return; }
    if (!form.from_date || !form.to_date) { toast.error("Choose the holiday dates"); return; }
    if (form.to_date < form.from_date) { toast.error("To date must be on or after from date"); return; }
    setBusy(true);
    try {
      const payload = { ...form, name: form.name.trim(), description: form.description?.trim() || null };
      if (editing) await holidaysApi.update(editing.id, payload);
      else await holidaysApi.create(payload);
      toast.success(editing ? "Holiday updated" : "Holiday added");
      setForm(null);
      refresh();
    } catch (e) {
      toast.error("Could not save holiday", { description: errorText(e) });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (h: Holiday) => {
    if (!window.confirm(`Delete the holiday "${h.name}"? Leave already booked over this date is not recalculated.`)) return;
    try {
      await holidaysApi.delete(h.id);
      toast.success("Holiday deleted");
      refresh();
    } catch (e) {
      toast.error("Could not delete holiday", { description: errorText(e) });
    }
  };

  const scopeText = (h: Holiday) => {
    const parts = [
      ...(h.employee_type_ids ?? []).map((id) => typeNames.get(id) ?? "Unknown type"),
      ...(h.department_ids ?? []).map((id) => deptNames.get(id) ?? "Unknown department"),
      ...(h.locations ?? []),
    ];
    return parts.length ? parts.join(", ") : "Everyone";
  };

  return (
    <div className="space-y-4">
      <PageTitle icon={<CalendarHeart className="size-6" />} title="Holiday Management"
        subtitle="Holidays are excluded from leave duration for the employees they apply to."
        actions={<Button className="bg-navy text-navy-foreground hover:bg-navy/90" onClick={() => open()}><Plus className="size-4" /> Add holiday</Button>} />
      <div className="flex items-center gap-2">
        <Button size="icon" variant="outline" aria-label="Previous year" onClick={() => setYear((y) => y - 1)}><ChevronLeft className="size-4" /></Button>
        <span className="w-16 text-center font-semibold">{year}</span>
        <Button size="icon" variant="outline" aria-label="Next year" onClick={() => setYear((y) => y + 1)}><ChevronRight className="size-4" /></Button>
      </div>
      <div className="rounded-xl border bg-card shadow-sm">
        {q.isLoading ? <Loader2 className="mx-auto my-10 size-5 animate-spin" /> : q.isError ? <EmptyState title="Could not load holidays" description={errorText(q.error)} /> : !q.data?.length ? (
          <EmptyState title={`No holidays in ${year}`} action={<Button onClick={() => open()}>Add holiday</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Holiday</TableHead><TableHead>From</TableHead><TableHead>To</TableHead><TableHead>Type</TableHead><TableHead>Applies to</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {q.data.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell><p className="font-medium">{h.name}</p>{h.description && <p className="text-xs text-muted-foreground">{h.description}</p>}</TableCell>
                    <TableCell>{fmtDate(h.from_date)}</TableCell>
                    <TableCell>{fmtDate(h.to_date)}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{h.holiday_type}</Badge></TableCell>
                    <TableCell className="max-w-64 truncate text-sm" title={scopeText(h)}>{scopeText(h)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => open(h)} aria-label={`Edit ${h.name}`}><Pencil className="size-4" /></Button>
                        <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => remove(h)} aria-label={`Delete ${h.name}`}><Trash2 className="size-4" /></Button>
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
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit holiday" : "Add holiday"}</DialogTitle></DialogHeader>
          {form && (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2"><Label className="text-xs">Name *</Label><Input value={form.name} maxLength={120} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div className="space-y-1"><Label className="text-xs">From *</Label><Input type="date" value={form.from_date} onChange={(e) => setForm({ ...form, from_date: e.target.value, to_date: form.to_date < e.target.value ? e.target.value : form.to_date })} /></div>
                <div className="space-y-1"><Label className="text-xs">To *</Label><Input type="date" min={form.from_date} value={form.to_date} onChange={(e) => setForm({ ...form, to_date: e.target.value })} /></div>
                <div className="space-y-1">
                  <Label className="text-xs">Holiday type</Label>
                  <Select value={form.holiday_type} onValueChange={(v) => setForm({ ...form, holiday_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{HOLIDAY_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label className="text-xs">Description</Label><Input value={form.description ?? ""} maxLength={500} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              </div>
              <p className="text-sm font-semibold">Applicability</p>
              <p className="-mt-2 text-xs text-muted-foreground">An employee gets the holiday when they match every list that has a selection.</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <ScopeList label="Employee types" options={typesQ.data ?? []} value={form.employee_type_ids} onChange={(v) => setForm({ ...form, employee_type_ids: v })} />
                <ScopeList label="Departments" options={deptQ.data ?? []} value={form.department_ids} onChange={(v) => setForm({ ...form, department_ids: v })} />
                <ScopeList label="Locations" options={locations} value={form.locations} onChange={(v) => setForm({ ...form, locations: v })} />
              </div>
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
