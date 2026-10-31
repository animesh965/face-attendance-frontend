import { Users, UserCheck } from "lucide-react";
import { Card } from "@/components/ui/card";

export function AttendanceSummary({
  totalEmployees,
  fullAttendanceToday,
}: {
  totalEmployees: number;
  fullAttendanceToday: number;
}) {
  return (
    <Card className="flex h-full flex-col justify-center gap-5 rounded-2xl border-border/70 p-6 shadow-sm">
      <div className="flex items-center gap-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Users className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm text-muted-foreground">Number of Employees</p>
          <p className="text-3xl font-semibold tracking-tight">{totalEmployees}</p>
        </div>
      </div>
      <div className="h-px bg-border" />
      <div className="flex items-center gap-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
          <UserCheck className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm text-muted-foreground">Full Attendance Today</p>
          <p className="text-3xl font-semibold tracking-tight">{fullAttendanceToday}</p>
        </div>
      </div>
    </Card>
  );
}