import { useEffect } from "react";
import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { LeaveNav, buildSections } from "@/components/leave/LeaveNav";
import { leaveApi } from "@/api/leave";
import { useAppStore } from "@/store/useAppStore";

export const Route = createFileRoute("/leave")({
  head: () => ({ meta: [{ title: "Leave Tracker" }, { name: "description", content: "Leave summary, requests, team leave and administration" }] }),
  component: LeaveLayout,
});

function LeaveLayout() {
  const user = useAppStore((s) => s.user);
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const { data: profile } = useQuery({ queryKey: ["leave", "profile"], queryFn: leaveApi.profile });
  const isManager = Boolean(profile?.is_manager);

  // Admin screens are also enforced by the API; this only keeps employees off pages they cannot use.
  useEffect(() => {
    if (!isAdmin && pathname.startsWith("/leave/admin")) navigate({ to: "/leave/summary", replace: true });
    if (!isAdmin && profile && !isManager && pathname.startsWith("/leave/team")) navigate({ to: "/leave/summary", replace: true });
  }, [isAdmin, isManager, profile, pathname, navigate]);
  // Don't mount a page (and fire its requests) while the redirect above is pending.
  const blocked = (!isAdmin && pathname.startsWith("/leave/admin"))
    || (!isAdmin && pathname.startsWith("/leave/team") && (!profile || !isManager));

  return (
    <DashboardLayout
      title="Leave Tracker"
      description="Apply for leave, track balances and requests, view team availability and holidays."
      breadcrumbs={[{ label: "Leave Tracker" }]}
    >
      <LeaveNav sections={buildSections({ isAdmin, isManager })} />
      {!blocked && <Outlet />}
    </DashboardLayout>
  );
}
