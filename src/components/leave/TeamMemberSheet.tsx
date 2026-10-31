import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { leaveApi } from "@/api/leave";
import { useAppStore } from "@/store/useAppStore";
import { RequestDetailDialog } from "./RequestDetailDialog";
import { EmptyState, StatusBadge, errorText, fmtDate, fmtDays } from "./leave-ui";

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("") || "?";
}

export function photoUrl(photo?: string) {
  return photo && /^(https?:|data:)/.test(photo) ? photo : undefined;
}

export function to12h(hhmm: string) {
  const [h = NaN, m = 0] = hhmm.split(":").map(Number);
  if (Number.isNaN(h)) return hhmm;
  const suffix = h >= 12 ? "PM" : "AM";
  return `${((h + 11) % 12) + 1}:${String(m || 0).padStart(2, "0")} ${suffix}`;
}

export const TONE_CLASS = {
  leave: "text-rose-600",
  holiday: "text-violet-600",
  weekend: "text-amber-500",
  present: "text-emerald-600",
  absent: "text-muted-foreground",
} as const;

export function TeamMemberSheet({ employeeId, onClose }: { employeeId: string | null; onClose: () => void }) {
  const q = useQuery({ queryKey: ["leave", "team-member", employeeId], queryFn: () => leaveApi.teamMember(employeeId as string), enabled: !!employeeId });
  const isAdmin = ["admin", "super_admin"].includes(useAppStore((s) => s.user?.role) ?? "");
  const [openId, setOpenId] = useState<string | null>(null);
  const m = q.data;

  return (
    <>
      <Sheet open={!!employeeId} onOpenChange={(o) => !o && onClose()}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader><SheetTitle>Employee details</SheetTitle></SheetHeader>
          {q.isLoading ? <Loader2 className="mx-auto my-10 size-6 animate-spin" /> : q.isError || !m ? (
            <EmptyState title="Could not load employee" description={errorText(q.error)} />
          ) : (
            <div className="space-y-5 px-4 pb-6">
              <div className="flex items-center gap-4">
                <Avatar className="size-16 rounded-lg">
                  <AvatarImage src={photoUrl(m.photo)} alt={m.name} />
                  <AvatarFallback className="rounded-lg bg-navy/10 text-lg text-navy">{initials(m.name)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-lg font-semibold">{m.employee_id ? `${m.employee_id} - ` : ""}{m.name}</p>
                  <p className={`text-sm ${TONE_CLASS[m.tone]}`}>{m.status}</p>
                  <p className="text-xs text-muted-foreground">{m.shift.name} - {to12h(m.shift.start_time)} - {to12h(m.shift.end_time)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-muted-foreground">Employee type</p><p>{m.employee_type || "-"}</p></div>
                <div><p className="text-xs text-muted-foreground">Department</p><p>{m.department || "-"}</p></div>
                <div><p className="text-xs text-muted-foreground">Email</p><p className="break-all">{m.email}</p></div>
                <div><p className="text-xs text-muted-foreground">Date of joining</p><p>{fmtDate(m.date_of_joining)}</p></div>
                <div><p className="text-xs text-muted-foreground">Attendance ({m.attendance.month})</p><p>{m.attendance.present_days} day(s) present</p></div>
                <div><p className="text-xs text-muted-foreground">Today</p><p>{m.attendance.today}</p></div>
              </div>
              <Tabs defaultValue="balance">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="balance">Balance</TabsTrigger>
                  <TabsTrigger value="eligibility">Eligibility</TabsTrigger>
                  <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                  <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>
                <TabsContent value="balance" className="space-y-2">
                  {m.balances.length === 0 ? <EmptyState title="No leave types mapped" /> : m.balances.map((b) => (
                    <div key={b.leave_type_id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                      <span className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ backgroundColor: b.color }} />{b.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {b.is_lwp ? "Unpaid" : <>Available <b className="text-foreground">{fmtDays(b.available)}</b></>} &middot; Booked {fmtDays(b.booked)} &middot; Pending {fmtDays(b.pending)}
                      </span>
                    </div>
                  ))}
                </TabsContent>
                <TabsContent value="eligibility" className="flex flex-wrap gap-2">
                  {m.eligibility.map((e) => (
                    <Badge key={e.leave_type_id} variant="outline" className={e.eligible ? "border-emerald-300 text-emerald-700" : "text-muted-foreground line-through"}>
                      {e.name}{e.source === "employee" ? " (individual)" : ""}
                    </Badge>
                  ))}
                </TabsContent>
                {(["upcoming", "history"] as const).map((key) => (
                  <TabsContent key={key} value={key} className="space-y-2">
                    {m[key].length === 0 ? <EmptyState /> : m[key].map((r) => (
                      <button key={r.id} className="flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-sm hover:bg-muted/40" onClick={() => setOpenId(r.id)}>
                        <span>
                          <span className="font-medium">{r.leave_type.name}</span> &middot; {fmtDays(r.days)} day(s)
                          <span className="block text-xs text-muted-foreground">{fmtDate(r.from_date)} - {fmtDate(r.to_date)}</span>
                        </span>
                        <StatusBadge status={r.status} />
                      </button>
                    ))}
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          )}
        </SheetContent>
      </Sheet>
      <RequestDetailDialog requestId={openId} mode={isAdmin ? "admin" : "team"} onClose={() => setOpenId(null)} />
    </>
  );
}
