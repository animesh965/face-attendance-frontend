
import { Link, useRouterState } from "@tanstack/react-router";
//import { ScanFace } from "lucide-react";
import { navItems } from "./nav-items";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import { LayoutDashboard, ScanFace, UserPlus, Users, CalendarCheck, Cctv, BarChart3, Settings } from "lucide-react";
export function AppSidebar({
  onNavigate,
}: {
  onNavigate?: (() => void) | undefined;
}) {
  const pathname = useRouterState({
    select: (r) => r.location.pathname,
  });

  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const hasPermission = useAppStore((s) => s.hasPermission);

  const allowedNavItems = navItems.filter((item) =>
    hasPermission(item.permission),
  );

  return (
    <aside
      className={cn(
        "flex h-full flex-col bg-sidebar text-sidebar-foreground transition-[width] duration-300",
        collapsed ? "w-[76px]" : "w-[264px]",
      )}
    >
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-5">
        <div className="gradient-primary flex size-9 shrink-0 items-center justify-center rounded-xl shadow-lg">
          <ScanFace className="size-5 text-primary-foreground" />
        </div>

        {!collapsed && (
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-tight">
              Face Recognition
            </p>
            <p className="text-[11px] text-sidebar-foreground/60">
              AI Attendance Suite
            </p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {allowedNavItems.map((item) => {
          const active = pathname.startsWith(item.url);

          return (
            <Link
              key={item.url}
              to={item.url}
              onClick={onNavigate}
              title={item.title}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              {active && (
                <span className="absolute top-1/2 left-0 h-6 w-1 -translate-y-1/2 rounded-r-full bg-sidebar-primary" />
              )}

              <item.icon
                className={cn(
                  "size-[18px] shrink-0",
                  active && "text-sidebar-primary",
                )}
              />

              {!collapsed && (
                <span className="truncate">{item.title}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="m-3 rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-3">
          <p className="mt-1 text-[11px] text-sidebar-foreground/60">
            Powered by MSSPL VertexFace AI 2026
          </p>
        </div>
      )}
    </aside>
  );
}


// import { Link, useRouterState } from "@tanstack/react-router";
// import { ScanFace, ShieldCheck } from "lucide-react";
// import { navItems } from "./nav-items";
// import { cn } from "@/lib/utils";
// import { useAppStore } from "@/store/useAppStore";

// export function AppSidebar({ onNavigate }: { onNavigate?: (() => void) | undefined }) {
//   const pathname = useRouterState({ select: (r) => r.location.pathname });
//   const collapsed = useAppStore((s) => s.sidebarCollapsed);

//   return (
//     <aside
//       className={cn(
//         "flex h-full flex-col bg-sidebar text-sidebar-foreground transition-[width] duration-300",
//         collapsed ? "w-[76px]" : "w-[264px]",
//       )}
//     >
//       <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-5">
//         <div className="gradient-primary flex size-9 shrink-0 items-center justify-center rounded-xl shadow-lg">
//           <ScanFace className="size-5 text-primary-foreground" />
//         </div>
//         {!collapsed && (
//           <div className="leading-tight">
//             <p className="text-sm font-semibold tracking-tight">Face Recognition</p>
//             <p className="text-[11px] text-sidebar-foreground/60">AI Attendance Suite</p>
//           </div>
//         )}
//       </div>

//       <nav className="flex-1 space-y-1 overflow-y-auto p-3">
//         {navItems.map((item) => {
//           const active = item.url === "/" ? pathname === "/" : pathname.startsWith(item.url);
//           return (
//             <Link
//               key={item.url}
//               to={item.url}
//               onClick={onNavigate}
//               title={item.title}
//               className={cn(
//                 "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
//                 active
//                   ? "bg-sidebar-accent text-sidebar-accent-foreground"
//                   : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
//               )}
//             >
//               {active && (
//                 <span className="absolute top-1/2 left-0 h-6 w-1 -translate-y-1/2 rounded-r-full bg-sidebar-primary" />
//               )}
//               <item.icon className={cn("size-[18px] shrink-0", active && "text-sidebar-primary")} />
//               {!collapsed && <span className="truncate">{item.title}</span>}
//             </Link>
//           );
//         })}
//       </nav>

//       {!collapsed && (
//         <div className="m-3 rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-3">
//           {/* <div className="flex items-center gap-2 text-xs font-medium">
//             <ShieldCheck className="size-4 text-sidebar-primary" />
//             Edge inference healthy
//           </div> */}
//           <p className="mt-1 text-[11px] text-sidebar-foreground/60">
//             Powered by MSSPL VertexFace AI 2026
//           </p>
//         </div>
//       )}
//     </aside>
//   );
// }