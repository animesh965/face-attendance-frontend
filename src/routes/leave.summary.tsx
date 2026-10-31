import { useMemo, useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { addMonths, format, parseISO } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, Info, List, Loader2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { leaveApi, type HolidayView, type LeaveCard, type LeaveRequest } from "@/api/leave";
import { ApplyLeaveDialog } from "@/components/leave/ApplyLeaveDialog";
import { RequestDetailDialog } from "@/components/leave/RequestDetailDialog";
import { LeaveMonthCalendar } from "@/components/leave/LeaveMonthCalendar";
import { EmptyState, LeaveTypeIcon, StatusBadge, errorText, fmtDate, fmtDays } from "@/components/leave/leave-ui";

export const Route = createFileRoute("/leave/summary")({
  head: () => ({ meta: [{ title: "Leave Summary" }] }),
  component: LeaveSummaryPage,
});

const SOURCE_LABEL: Record<string, string> = {
  employee_allocation: "individual allocation", employee_type_allocation: "employee type allocation",
  employee_type_policy: "employee type policy", global_policy: "leave policy", leave_type: "leave type default",
};

function BalanceCard({ card, onApply }: { card: LeaveCard; onApply: () => void }) {
  return (
    <div className="flex flex-col rounded-lg border bg-card p-4 shadow-sm">
      <p className="text-center text-sm font-medium">{card.name}</p>
      <div className="my-3 flex justify-center">
        <button type="button" onClick={onApply} disabled={!card.eligible} title={card.eligible ? `Apply ${card.name}` : "Not currently eligible"}>
          <LeaveTypeIcon icon={card.icon} color={card.color} />
        </button>
      </div>
      <div className="mt-auto space-y-1.5 border-t pt-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Available</span>
          <span className={cn("font-semibold", (card.available ?? 0) > 0 ? "text-emerald-600" : "text-foreground")}>
            {card.is_lwp ? "-" : fmtDays(card.available)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Booked</span>
          <span className="flex items-center gap-1.5">
            {fmtDays(card.booked)}
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" aria-label={`${card.name} details`}><Info className="size-3.5 text-muted-foreground" /></button>
              </TooltipTrigger>
              <TooltipContent className="max-w-64 text-xs">
                {card.is_lwp ? (
                  <p>Unpaid leave. No balance is held; booked days are deducted from pay.</p>
                ) : (
                  <div className="space-y-0.5">
                    <p>Annual entitlement: {fmtDays(card.entitlement)} ({SOURCE_LABEL[card.allocation_source ?? ""] ?? "policy"})</p>
                    <p>Credited so far: {fmtDays(card.accrued)} ({card.accrual_frequency})</p>
                    {card.opening !== 0 && <p>Opening balance: {fmtDays(card.opening)}</p>}
                    {card.carry_forward !== 0 && <p>Carried forward: {fmtDays(card.carry_forward)}</p>}
                    {card.adjusted !== 0 && <p>Adjustments: {fmtDays(card.adjusted)}</p>}
                    <p>Booked (approved): {fmtDays(card.booked)}</p>
                    <p>Pending approval: {fmtDays(card.pending)}</p>
                  </div>
                )}
                {!card.eligible && <p className="mt-1 font-medium">You are no longer eligible for this leave type.</p>}
              </TooltipContent>
            </Tooltip>
          </span>
        </div>
        {card.pending > 0 && (
          <div className="flex justify-between text-xs text-amber-600">
            <span>Pending</span>
            <span>{fmtDays(card.pending)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

type FeedFilter = "both" | "leaves" | "holidays";

function Feed({ title, leaves, holidays, onOpen }: { title: string; leaves: LeaveRequest[]; holidays: HolidayView[]; onOpen: (id: string) => void }) {
  const [filter, setFilter] = useState<FeedFilter>("both");
  const items = useMemo(() => {
    const rows: { key: string; date: string; node: ReactNode }[] = [];
    if (filter !== "holidays") {
      for (const l of leaves) {
        rows.push({
          key: l.id, date: l.from_date,
          node: (
            <button className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left hover:bg-muted/40" onClick={() => onOpen(l.id)}>
              <span className="w-1 self-stretch rounded" style={{ backgroundColor: l.leave_type.color }} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{l.leave_type.name} &middot; {fmtDays(l.days)} day(s)</p>
                <p className="text-xs text-muted-foreground">
                  {fmtDate(l.from_date)}{l.to_date !== l.from_date ? ` - ${fmtDate(l.to_date)}` : ""}{l.half_day ? " (half day)" : ""}
                </p>
              </div>
              <StatusBadge status={l.status} />
            </button>
          ),
        });
      }
    }
    if (filter !== "leaves") {
      for (const h of holidays) {
        rows.push({
          key: h.id, date: h.from_date,
          node: (
            <div className="flex items-center gap-3 px-4 py-3">
              <span className="w-1 self-stretch rounded bg-violet-500" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{h.name}</p>
                <p className="text-xs text-muted-foreground">{fmtDate(h.from_date)}{h.to_date !== h.from_date ? ` - ${fmtDate(h.to_date)}` : ""} &middot; Holiday</p>
              </div>
            </div>
          ),
        });
      }
    }
    return rows.sort((a, b) => a.date.localeCompare(b.date));
  }, [filter, leaves, holidays, onOpen]);

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <Select value={filter} onValueChange={(v) => setFilter(v as FeedFilter)}>
        <SelectTrigger className="w-60"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="both">{title} Leaves &amp; Holidays</SelectItem>
          <SelectItem value="leaves">{title} Leaves</SelectItem>
          <SelectItem value="holidays">{title} Holidays</SelectItem>
        </SelectContent>
      </Select>
      <div className="mt-3 rounded-lg border">
        {items.length ? <div className="divide-y">{items.map((i) => <div key={i.key}>{i.node}</div>)}</div> : <EmptyState />}
      </div>
    </div>
  );
}

function LeaveSummaryPage() {
  const settingsQ = useQuery({ queryKey: ["leave", "settings"], queryFn: leaveApi.settings });
  const [year, setYear] = useState<number | null>(null);
  const activeYear = year ?? settingsQ.data?.current_year;
  const q = useQuery({ queryKey: ["leave", "summary", activeYear], queryFn: () => leaveApi.summary(activeYear), enabled: !!activeYear });
  const [view, setView] = useState<"list" | "calendar">("list");
  const [applyOpen, setApplyOpen] = useState(false);
  const [applyType, setApplyType] = useState<string | undefined>();
  const [openId, setOpenId] = useState<string | null>(null);
  const [month, setMonth] = useState(new Date());
  const data = q.data;

  const allLeaves = data ? [...data.upcoming.leaves, ...data.past.leaves].filter((l) => l.status !== "rejected" && l.status !== "cancelled") : [];
  const allHolidays = data ? [...data.upcoming.holidays, ...data.past.holidays] : [];

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Leave booked this year : <b className="text-foreground">{fmtDays(data?.booked_total ?? 0)}</b> &nbsp;|&nbsp; Absent : <b className="text-foreground">{data?.absent_days ?? 0}</b>
          </p>
          <div className="flex items-center gap-1 rounded-md border bg-card px-1 py-1 text-sm">
            <Button variant="ghost" size="icon" className="size-7" onClick={() => activeYear && setYear(activeYear - 1)} aria-label="Previous year"><ChevronLeft className="size-4" /></Button>
            <CalendarDays className="size-4 text-muted-foreground" />
            <span className="px-2 font-medium">{data ? `${fmtDate(data.period.start)} - ${fmtDate(data.period.end)}` : "..."}</span>
            <Button variant="ghost" size="icon" className="size-7" onClick={() => activeYear && setYear(activeYear + 1)} aria-label="Next year"><ChevronRight className="size-4" /></Button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border bg-card">
              <Button variant="ghost" size="icon" className={cn("size-8 rounded-r-none", view === "list" && "bg-navy/10 text-navy")} onClick={() => setView("list")} aria-label="List view"><List className="size-4" /></Button>
              <Button variant="ghost" size="icon" className={cn("size-8 rounded-l-none", view === "calendar" && "bg-navy/10 text-navy")} onClick={() => { setView("calendar"); if (data) setMonth(parseISO(data.period.start) > new Date() || parseISO(data.period.end) < new Date() ? parseISO(data.period.start) : new Date()); }} aria-label="Calendar view"><CalendarDays className="size-4" /></Button>
            </div>
            <Button className="bg-sky-500 text-white hover:bg-sky-600" onClick={() => { setApplyType(undefined); setApplyOpen(true); }}>Apply Leave</Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="outline" size="icon" className="size-9" aria-label="More"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild><Link to="/leave/requests">My leave requests</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/leave/holidays/list">Holiday list</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/leave/calendar">Leave calendar</Link></DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {q.isLoading || settingsQ.isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
        ) : q.isError ? (
          <EmptyState title="Could not load your leave summary" description={errorText(q.error)} />
        ) : data && (
          <>
            {data.cards.length === 0 ? (
              <div className="rounded-xl border bg-card"><EmptyState title="No leave types available" description="No leave types are mapped to your employee type yet. Please contact your administrator." /></div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                {data.cards.map((c) => (
                  <BalanceCard key={c.leave_type_id} card={c} onApply={() => { setApplyType(c.leave_type_id); setApplyOpen(true); }} />
                ))}
              </div>
            )}
            {view === "list" ? (
              <>
                <Feed title="Upcoming" leaves={data.upcoming.leaves} holidays={data.upcoming.holidays} onOpen={setOpenId} />
                <Feed title="Past" leaves={data.past.leaves} holidays={data.past.holidays} onOpen={setOpenId} />
              </>
            ) : (
              <div className="rounded-xl border bg-card shadow-sm">
                <div className="flex items-center justify-between border-b px-4 py-2">
                  <Button variant="ghost" size="icon" onClick={() => setMonth((m) => addMonths(m, -1))} aria-label="Previous month"><ChevronLeft className="size-4" /></Button>
                  <p className="text-sm font-semibold">{format(month, "MMMM yyyy")}</p>
                  <Button variant="ghost" size="icon" onClick={() => setMonth((m) => addMonths(m, 1))} aria-label="Next month"><ChevronRight className="size-4" /></Button>
                </div>
                <LeaveMonthCalendar anchor={month} leaves={allLeaves} holidays={allHolidays} weeklyOffs={data.weekly_offs} onSelectLeave={(l) => setOpenId(l.id)} />
              </div>
            )}
          </>
        )}
      </div>
      <ApplyLeaveDialog open={applyOpen} onOpenChange={setApplyOpen} defaultLeaveTypeId={applyType} />
      <RequestDetailDialog requestId={openId} mode="self" onClose={() => setOpenId(null)} />
    </TooltipProvider>
  );
}
