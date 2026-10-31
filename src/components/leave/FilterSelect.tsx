import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Option } from "./useFilterOptions";

const ANY = "__any__";

export function FilterSelect({ label, value, onChange, options, allLabel, className = "w-48" }: {
  label: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  options: Option[];
  allLabel: string;
  className?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value || ANY} onValueChange={(v) => onChange(v === ANY ? undefined : v)}>
        <SelectTrigger className={className}><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>{allLabel}</SelectItem>
          {options.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
