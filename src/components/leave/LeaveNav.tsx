import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export interface NavSection {
  key: string;
  label: string;
  to: string;
  match: string;
  tabs: { label: string; to: string }[];
}

export function buildSections({ isAdmin, isManager }: { isAdmin: boolean; isManager: boolean }): NavSection[] {
  const sections: NavSection[] = [
    {
      key: "my", label: "My Data", to: "/leave/summary", match: "/leave/(summary|requests|shift)",
      tabs: [
        { label: "Leave Summary", to: "/leave/summary" },
        { label: "Leave Requests", to: "/leave/requests" },
        { label: "Shift", to: "/leave/shift" },
      ],
    },
  ];
  if (isAdmin || isManager) {
    sections.push({
      key: "team", label: "Team", to: "/leave/team/reportees", match: "/leave/team",
      tabs: [
        { label: "Reportees", to: "/leave/team/reportees" },
        { label: "On Leave", to: "/leave/team/on-leave" },
        { label: "Leave Requests", to: "/leave/team/requests" },
      ],
    });
  }
  sections.push(
    {
      key: "holidays", label: "Holidays", to: "/leave/holidays", match: "/leave/holidays",
      tabs: [
        { label: "Holiday Calendar", to: "/leave/holidays" },
        { label: "Holiday List", to: "/leave/holidays/list" },
      ],
    },
    { key: "calendar", label: "Leave Calendar", to: "/leave/calendar", match: "/leave/calendar", tabs: [] },
  );
  if (isAdmin) {
    sections.push({
      key: "admin", label: "Admin", to: "/leave/admin/dashboard", match: "/leave/admin",
      tabs: [
        { label: "Leave Dashboard", to: "/leave/admin/dashboard" },
        { label: "Approvals", to: "/leave/admin/approvals" },
        { label: "Employee Leave Mapping", to: "/leave/admin/mapping" },
        { label: "Leave Types", to: "/leave/admin/leave-types" },
        { label: "Leave Policies", to: "/leave/admin/policies" },
        { label: "Leave Allocation", to: "/leave/admin/allocation" },
        { label: "Employees & Types", to: "/leave/admin/employees" },
        { label: "Holiday Management", to: "/leave/admin/holidays" },
        { label: "Leave Reports", to: "/leave/admin/reports" },
        { label: "Approval History", to: "/leave/admin/history" },
      ],
    });
  }
  return sections;
}

export function LeaveNav({ sections }: { sections: NavSection[] }) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const active = sections.find((s) => new RegExp(`^${s.match}`).test(pathname)) ?? sections[0]!;

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <nav className="flex gap-1 overflow-x-auto bg-navy px-2 text-navy-foreground">
        {sections.map((s) => (
          <Link
            key={s.key}
            to={s.to}
            className={cn(
              "relative whitespace-nowrap px-4 py-3 text-sm font-semibold transition-opacity",
              s.key === active.key ? "opacity-100" : "opacity-70 hover:opacity-100",
            )}
          >
            {s.label}
            {s.key === active.key && <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-t bg-sky-400" />}
          </Link>
        ))}
      </nav>
      {active.tabs.length > 0 && (
        <div className="flex gap-1 overflow-x-auto border-b px-2">
          {active.tabs.map((t) => {
            const on = pathname === t.to;
            return (
              <Link
                key={t.to}
                to={t.to}
                className={cn(
                  "relative whitespace-nowrap px-3 py-2.5 text-sm transition-colors",
                  on ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
                {on && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-t bg-sky-500" />}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
