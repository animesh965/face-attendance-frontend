import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { addDays, format, startOfWeek } from "date-fns";
import { Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { leaveApi } from "@/api/leave";
import { to12h } from "@/components/leave/TeamMemberSheet";
import { EmptyState, PageTitle, WEEKDAYS, errorText, fmtDate, isoDay } from "@/components/leave/leave-ui";

export const Route = createFileRoute("/leave/shift")({
  head: () => ({ meta: [{ title: "My Shift" }] }),
  component: ShiftPage,
});

function ShiftPage() {
  const profileQ = useQuery({ queryKey: ["leave", "profile"], queryFn: leaveApi.profile });
  const start = startOfWeek(new Date(), { weekStartsOn: 1 });
  const end = addDays(start, 13);
  const calQ = useQuery({
    queryKey: ["leave", "calendar", "shift", isoDay(start)],
    queryFn: () => leaveApi.calendar({ from_date: isoDay(start), to_date: isoDay(end) }),
  });
  const p = profileQ.data;
  if (profileQ.isLoading) return <div className="flex justify-center py-16"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>;
  if (profileQ.isError || !p) return <EmptyState title="Could not load your shift" description={errorText(profileQ.error)} />;

  const offs = new Set(calQ.data?.weekly_offs ?? []);
  const days = Array.from({ length: 14 }, (_, i) => addDays(start, i));
  const mine = (calQ.data?.leaves ?? []).filter((l) => l.employee.id === p.id && l.status !== "rejected" && l.status !== "cancelled");

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <PageTitle icon={<Clock className="size-6" />} title={`${p.shift.name} shift`} subtitle={`${to12h(p.shift.start_time)} - ${to12h(p.shift.end_time)}`} />
        <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div><p className="text-xs text-muted-foreground">Employee type</p><p className="font-medium">{p.employee_type || "Not assigned"}</p></div>
          <div><p className="text-xs text-muted-foreground">Reporting manager</p><p className="font-medium">{p.reporting_manager?.name ?? "-"}</p></div>
          <div><p className="text-xs text-muted-foreground">Weekly offs</p><p className="font-medium">{[...offs].map((d) => WEEKDAYS[d]).join(", ") || "-"}</p></div>
          <div><p className="text-xs text-muted-foreground">Date of joining</p><p className="font-medium">{fmtDate(p.date_of_joining)}</p></div>
        </div>
      </div>
      <div className="rounded-xl border bg-card shadow-sm">
        <p className="border-b px-4 py-3 text-sm font-semibold">Next two weeks</p>
        <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-7">
          {days.map((d) => {
            const key = isoDay(d);
            const off = offs.has((d.getDay() + 6) % 7);
            const holiday = calQ.data?.holidays.find((h) => h.from_date <= key && h.to_date >= key);
            const leave = mine.find((l) => l.from_date <= key && l.to_date >= key && !l.excluded_dates.some((e) => e.date === key));
            const label = leave ? `${leave.leave_type.name}${leave.status !== "approved" ? " (pending)" : ""}` : holiday ? holiday.name : off ? "Weekend" : `${to12h(p.shift.start_time)} - ${to12h(p.shift.end_time)}`;
            return (
              <div key={key} className={cn("bg-card p-3", key === isoDay(new Date()) && "ring-2 ring-navy ring-inset")}>
                <p className="text-xs text-muted-foreground">{format(d, "EEE, dd MMM")}</p>
                <p className={cn("mt-1 text-sm", leave ? "text-rose-600" : holiday ? "text-violet-600" : off ? "text-amber-500" : "")}>{label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
