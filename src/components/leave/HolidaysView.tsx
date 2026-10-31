import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { leaveApi, type HolidayView } from "@/api/leave";
import { EmptyState, WEEKDAYS, errorText, fmtDate, isoDay } from "./leave-ui";

function MiniMonth({ year, month, holidays, weeklyOffs }: { year: number; month: number; holidays: HolidayView[]; weeklyOffs: number[] }) {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7;
  const count = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [...Array(lead).fill(null), ...Array.from({ length: count }, (_, i) => new Date(year, month, i + 1))];
  const offs = new Set(weeklyOffs);
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="mb-2 text-center text-sm font-semibold">{format(first, "MMMM yyyy")}</p>
      <div className="grid grid-cols-7 gap-0.5 text-center text-[11px]">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i} className="font-medium text-muted-foreground">{d}</span>)}
        {cells.map((d, i) => {
          if (!d) return <span key={i} />;
          const key = isoDay(d);
          const h = holidays.find((x) => x.from_date <= key && x.to_date >= key);
          const off = offs.has((d.getDay() + 6) % 7);
          return (
            <span
              key={i}
              title={h?.name}
              className={cn("rounded py-1", h ? "bg-violet-600 font-semibold text-white" : off ? "text-amber-500" : "", key === isoDay(new Date()) && !h && "ring-1 ring-navy")}
            >
              {d.getDate()}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function HolidaysView({ mode }: { mode: "calendar" | "list" }) {
  const [year, setYear] = useState<number | undefined>();
  const q = useQuery({ queryKey: ["leave", "holidays", year], queryFn: () => leaveApi.holidays(year) });
  const data = q.data;

  const months: { y: number; m: number }[] = [];
  if (data) {
    const start = parseISO(data.start);
    for (let i = 0; i < 12; i++) {
      const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
      months.push({ y: d.getFullYear(), m: d.getMonth() });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 rounded-md border bg-card p-1 text-sm">
          <Button variant="ghost" size="icon" className="size-7" disabled={!data} onClick={() => data && setYear(data.year - 1)} aria-label="Previous year"><ChevronLeft className="size-4" /></Button>
          <span className="px-2 font-medium">{data ? `${fmtDate(data.start)} - ${fmtDate(data.end)}` : "..."}</span>
          <Button variant="ghost" size="icon" className="size-7" disabled={!data} onClick={() => data && setYear(data.year + 1)} aria-label="Next year"><ChevronRight className="size-4" /></Button>
        </div>
        {data && <p className="text-sm text-muted-foreground">{data.holidays.length} holiday(s) &middot; Weekly offs: {data.weekly_offs.map((d) => WEEKDAYS[d]).join(", ") || "none"}</p>}
      </div>
      {q.isLoading ? <div className="flex justify-center py-16"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
        : q.isError ? <EmptyState title="Could not load holidays" description={errorText(q.error)} />
        : !data ? null
        : mode === "calendar" ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {months.map(({ y, m }) => <MiniMonth key={`${y}-${m}`} year={y} month={m} holidays={data.holidays} weeklyOffs={data.weekly_offs} />)}
          </div>
        ) : !data.holidays.length ? (
          <div className="rounded-xl border bg-card"><EmptyState title="No holidays" description="No holidays are configured for this year." /></div>
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
            <Table>
              <TableHeader><TableRow><TableHead>Holiday</TableHead><TableHead>From</TableHead><TableHead>To</TableHead><TableHead>Day</TableHead><TableHead>Days</TableHead><TableHead>Type</TableHead><TableHead>Description</TableHead></TableRow></TableHeader>
              <TableBody>
                {data.holidays.map((h) => (
                  <TableRow key={h.id} className={cn(h.to_date < isoDay(new Date()) && "text-muted-foreground")}>
                    <TableCell className="font-medium">{h.name}</TableCell>
                    <TableCell>{fmtDate(h.from_date)}</TableCell>
                    <TableCell>{fmtDate(h.to_date)}</TableCell>
                    <TableCell>{fmtDate(h.from_date, "EEEE")}</TableCell>
                    <TableCell>{h.days}</TableCell>
                    <TableCell className="capitalize">{h.holiday_type}</TableCell>
                    <TableCell className="max-w-72 truncate">{h.description || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
    </div>
  );
}
