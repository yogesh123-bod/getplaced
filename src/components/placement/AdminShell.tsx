import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  FileCheck2,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  ScrollText,
  Settings,
  Target,
  Users,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useSession, useSignOut } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const ADMIN_NAV = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/students", label: "Students", icon: Users },
  { to: "/admin/companies", label: "Companies", icon: Building2 },
  { to: "/admin/jobs", label: "Jobs", icon: Briefcase },
  { to: "/admin/applications", label: "Applications", icon: FileCheck2 },
  { to: "/admin/announcements", label: "Announcements", icon: Megaphone },
  { to: "/admin/tests", label: "Tests", icon: Target },
  { to: "/admin/notifications", label: "Notifications", icon: Bell },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/admin/audit-logs", label: "Audit Logs", icon: ScrollText },
  { to: "/admin/settings", label: "Settings", icon: Settings },
] as const;

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex flex-1 flex-col gap-1">
      {ADMIN_NAV.map(({ to, label, icon: Icon }) => {
        const active = pathname === to || pathname.startsWith(`${to}/`);
        return (
          <Link
            key={to}
            to={to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { session } = useSession();
  const signOut = useSignOut();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/admin/login", replace: true });
  };

  const brand = (
    <div className="mb-8 flex items-center gap-2.5 px-2">
      <div className="flex size-9 items-center justify-center rounded-xl bg-sidebar-primary">
        <GraduationCap className="size-5 text-sidebar-primary-foreground" />
      </div>
      <div className="leading-tight">
        <p className="text-sm font-bold">Placement Cell</p>
        <p className="text-[11px] text-sidebar-foreground/60">Admin Console</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background lg:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-y-auto bg-sidebar px-4 py-6 text-sidebar-foreground lg:flex">
        {brand}
        <NavList />
        <div className="mt-4 rounded-xl bg-sidebar-accent p-3">
          <p className="truncate text-sm font-semibold">{session.email ?? "Admin"}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="mt-1 w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar/60 hover:text-sidebar-foreground"
          >
            <LogOut className="size-4" /> Logout
          </Button>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-border bg-card/95 px-4 py-3.5 backdrop-blur lg:px-8">
          <div className="flex items-center gap-3">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon" aria-label="Open menu">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 bg-sidebar px-4 py-6 text-sidebar-foreground">
                <SheetTitle className="sr-only">Admin navigation</SheetTitle>
                {brand}
                <NavList onNavigate={() => setOpen(false)} />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="mt-4 w-full justify-start text-sidebar-foreground/80"
                >
                  <LogOut className="size-4" /> Logout
                </Button>
              </SheetContent>
            </Sheet>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-bold">{title}</h1>
              {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
            </div>
            {actions}
          </div>
        </header>
        <div className="px-4 py-5 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
