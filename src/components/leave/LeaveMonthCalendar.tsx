import { addDays, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { cn } from "@/lib/utils";
import type { HolidayView, LeaveRequest } from "@/api/leave";
import { isoDay } from "./leave-ui";

// JS getDay(): Sun=0..Sat=6. Backend weekly offs use Python weekday(): Mon=0..Sun=6.
const toPyWeekday = (d: Date) => (d.getDay() + 6) % 7;

export function calendarRange(anchor: Date, view: "month" | "week") {
  if (view === "week") return { start: startOfWeek(anchor, { weekStartsOn: 1 }), end: endOfWeek(anchor, { weekStartsOn: 1 }) };
  return { start: startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 }) };
}

export function LeaveMonthCalendar({
  anchor, view = "month", leaves = [], holidays = [], weeklyOffs = [], onSelectLeave, showEmployee = false,
}: {
  anchor: Date;
  view?: "month" | "week";
  leaves?: LeaveRequest[];
  holidays?: HolidayView[];
  weeklyOffs?: number[];
  onSelectLeave?: (leave: LeaveRequest) => void;
  showEmployee?: boolean;
}) {
  const { start, end } = calendarRange(anchor, view);
  const days: Date[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
  const todayKey = isoDay(new Date());
  const offs = new Set(weeklyOffs);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        <div className="grid grid-cols-7 border-b text-center text-xs font-semibold text-muted-foreground">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="py-2">{d}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const key = isoDay(day);
            const dayLeaves = leaves.filter((l) => l.from_date <= key && l.to_date >= key && !l.excluded_dates.some((e) => e.date === key));
            const dayHolidays = holidays.filter((h) => h.from_date <= key && h.to_date >= key);
            const off = offs.has(toPyWeekday(day));
            const muted = view === "month" && !isSameMonth(day, anchor);
            return (
              <div
                key={key}
                className={cn(
                  "min-h-[96px] border-r border-b p-1.5 text-xs last:border-r-0",
                  view === "week" && "min-h-[180px]",
                  off && "bg-muted/50",
                  muted && "opacity-45",
                )}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className={cn("inline-flex size-6 items-center justify-center rounded-full", key === todayKey && "bg-navy font-semibold text-navy-foreground")}>
                    {format(day, "d")}
                  </span>
                  {off && <span className="text-[10px] text-muted-foreground">Weekend</span>}
                </div>
                <div className="space-y-1">
                  {dayHolidays.map((h) => (
                    <div key={h.id} className="truncate rounded bg-violet-100 px-1.5 py-0.5 text-violet-800 dark:bg-violet-500/20 dark:text-violet-200" title={h.description ?? h.name}>
                      {h.name}
                    </div>
                  ))}
                  {dayLeaves.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => onSelectLeave?.(l)}
                      className={cn("block w-full truncate rounded px-1.5 py-0.5 text-left text-white", l.status !== "approved" && "opacity-70 outline-1 outline-dashed outline-white/70 -outline-offset-2")}
                      style={{ backgroundColor: l.leave_type.color }}
                      title={`${l.employee.name} - ${l.leave_type.name} (${l.status.replace("_", " ")})`}
                    >
                      {showEmployee ? l.employee.name : l.leave_type.name}
                      {l.half_day ? " (½)" : ""}
                      {l.status !== "approved" ? " ·" : ""}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
