import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { AppSidebar } from "./AppSidebar";
import { Topbar } from "./Topbar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useAppStore } from "@/store/useAppStore";
import { NeuralBackdrop } from "@/components/three/NeuralBackdrop";

interface Props {
  title: string;
  description?: string;
  breadcrumbs?: { label: string; to?: string }[];
  actions?: ReactNode;
  children: ReactNode;
}

export function DashboardLayout({ title, description, breadcrumbs = [], actions, children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const darkMode = useAppStore((s) => s.darkMode);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  return (
    <div className="flex min-h-screen w-full bg-background">
      <div className="sticky top-0 hidden h-screen lg:block">
        <AppSidebar />
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[264px] border-0 p-0">
          <AppSidebar onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenMobile={() => setMobileOpen(true)} />

        <div className="relative overflow-hidden border-b bg-card/40">
          <NeuralBackdrop className="pointer-events-none absolute inset-0 opacity-60" />
          <div className="relative flex flex-col gap-3 px-4 py-6 md:flex-row md:items-end md:justify-between md:px-6">
            <div>
              <nav className="flex items-center gap-1 text-xs text-muted-foreground">
                <Link to="/" className="hover:text-foreground">
                  Console
                </Link>
                {breadcrumbs.map((b) => (
                  <span key={b.label} className="flex items-center gap-1">
                    <ChevronRight className="size-3" />
                    <span className="text-foreground/80">{b.label}</span>
                  </span>
                ))}
              </nav>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-2xl">{title}</h1>
              {description && (
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
              )}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
          </div>
        </div>

        <main className="flex-1 space-y-6 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}