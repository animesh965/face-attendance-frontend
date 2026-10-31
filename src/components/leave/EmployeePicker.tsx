import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { EmployeeBrief, EmployeeType } from "@/api/leave";
import { TriCheckbox } from "./leave-ui";

const ALL = "__all__";

/** Searchable multi-select of employees with an employee-type filter and select-all for the filtered set. */
export function EmployeePicker({ employees, employeeTypes, selected, onChange, height = "h-64" }: {
  employees: EmployeeBrief[];
  employeeTypes: EmployeeType[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  height?: string;
}) {
  const [search, setSearch] = useState("");
  const [type, setType] = useState(ALL);
  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    return employees.filter((e) => (type === ALL || e.employee_type_id === type) && (!t || e.name.toLowerCase().includes(t) || e.employee_id.toLowerCase().includes(t)));
  }, [employees, search, type]);
  const allState = filtered.length && filtered.every((e) => selected.has(e.id)) ? true : filtered.some((e) => selected.has(e.id)) ? "indeterminate" : false;

  const toggleAll = (v: boolean) => {
    const next = new Set(selected);
    for (const e of filtered) {
      if (v) next.add(e.id);
      else next.delete(e.id);
    }
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or ID" className="h-9 pl-8" />
        </div>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All employee types</SelectItem>
            {employeeTypes.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-muted-foreground">
        <TriCheckbox checked={allState} onCheckedChange={toggleAll} disabled={!filtered.length} /> Check all ({selected.size} selected)
      </label>
      <div className={`overflow-y-auto rounded-md border ${height}`}>
        {filtered.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No employees</p> : filtered.map((e) => (
          <label key={e.id} className="flex cursor-pointer items-center gap-3 border-b px-3 py-2 text-sm last:border-b-0 hover:bg-muted/40">
            <TriCheckbox checked={selected.has(e.id)} onCheckedChange={(v) => { const n = new Set(selected); if (v) n.add(e.id); else n.delete(e.id); onChange(n); }} />
            <span className="min-w-0 flex-1 truncate">{e.employee_id ? `${e.employee_id} - ` : ""}{e.name}</span>
            <span className="text-xs text-muted-foreground">{e.employee_type || "No type"}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
