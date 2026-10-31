import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const map: Record<string, string> = {
  recognized: "bg-success/12 text-success border-success/30",
  present: "bg-success/12 text-success border-success/30",
  active: "bg-success/12 text-success border-success/30",
  online: "bg-success/12 text-success border-success/30",
  unknown: "bg-warning/15 text-warning border-warning/30",
  late: "bg-warning/15 text-warning border-warning/30",
  "half-day": "bg-warning/15 text-warning border-warning/30",
  reconnecting: "bg-warning/15 text-warning border-warning/30",
  unauthorized: "bg-destructive/10 text-destructive border-destructive/30",
  absent: "bg-destructive/10 text-destructive border-destructive/30",
  offline: "bg-destructive/10 text-destructive border-destructive/30",
  inactive: "bg-muted text-muted-foreground border-border",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={cn("capitalize", map[status] ?? "")}>
      {status}
    </Badge>
  );
}