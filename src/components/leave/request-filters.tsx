import { useState } from "react";
import { ArrowDown, ArrowUp, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableHead } from "@/components/ui/table";
import type { RequestFilters } from "@/api/leave";
import { STATUS_LABEL } from "./leave-ui";

const ANY = "__any__";

export function SortHead({ label, field, filters, onSort }: { label: string; field: string; filters: RequestFilters; onSort: (f: string) => void }) {
  const active = filters.sort_by === field;
  return (
    <TableHead>
      <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => onSort(field)}>
        {label}
        {active && (filters.sort_dir === 1 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
      </button>
    </TableHead>
  );
}

export function RequestFilterPanel({ filters, onApply, leaveTypes }: {
  filters: RequestFilters; onApply: (f: RequestFilters) => void; leaveTypes: { id: string; name: string }[];
}) {
  const [draft, setDraft] = useState<RequestFilters>(filters);
  const [open, setOpen] = useState(false);
  const count = ["status", "leave_type_id", "from_date", "to_date"].filter((k) => filters[k as keyof RequestFilters]).length;
  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) setDraft(filters); }}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5"><Filter className="size-4" /> Filter{count ? ` (${count})` : ""}</Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">Status</Label>
          <Select value={draft.status || ANY} onValueChange={(v) => setDraft({ ...draft, status: v === ANY ? undefined : v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>All statuses</SelectItem>
              {Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Leave type</Label>
          <Select value={draft.leave_type_id || ANY} onValueChange={(v) => setDraft({ ...draft, leave_type_id: v === ANY ? undefined : v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>All leave types</SelectItem>
              {leaveTypes.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1"><Label className="text-xs">From</Label><Input type="date" value={draft.from_date ?? ""} onChange={(e) => setDraft({ ...draft, from_date: e.target.value || undefined })} /></div>
          <div className="space-y-1"><Label className="text-xs">To</Label><Input type="date" value={draft.to_date ?? ""} onChange={(e) => setDraft({ ...draft, to_date: e.target.value || undefined })} /></div>
        </div>
        <div className="flex justify-between">
          <Button variant="ghost" size="sm" onClick={() => { onApply({ ...filters, status: undefined, leave_type_id: undefined, from_date: undefined, to_date: undefined, page: 1 }); setOpen(false); }}>Clear</Button>
          <Button size="sm" className="bg-navy text-navy-foreground hover:bg-navy/90" onClick={() => { onApply({ ...draft, page: 1 }); setOpen(false); }}>Apply</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
