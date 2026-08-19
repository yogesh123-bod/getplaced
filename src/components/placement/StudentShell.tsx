import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Bell, Briefcase, FileText, GraduationCap, Home, LogOut, ScrollText, Target, User } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useSession, useSignOut, useUnreadCount } from "@/lib/session";
import { initials } from "@/lib/format";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/jobs", label: "Jobs", icon: Briefcase },
  { to: "/resume", label: "Resume", icon: FileText },
  { to: "/tests", label: "Test Center", icon: Target },
  { to: "/account", label: "My Account", icon: User },
] as const;

const SIDE_EXTRA = [
  { to: "/applications", label: "My Applications", icon: ScrollText },
  { to: "/notifications", label: "Notifications", icon: Bell },
] as const;

export function StudentShell({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const signOut = useSignOut();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: unread = 0 } = useUnreadCount(session.userId);

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login", replace: true });
  };

  return (
    <div className="min-h-screen bg-background lg:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-sidebar px-4 py-6 text-sidebar-foreground lg:flex">
        <div className="mb-8 flex items-center gap-2.5 px-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-sidebar-primary">
            <GraduationCap className="size-5 text-sidebar-primary-foreground" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold">Campus Placements</p>
            <p className="text-[11px] text-sidebar-foreground/60">ABC College, Pune</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {[...NAV, ...SIDE_EXTRA].map(({ to, label, icon: Icon }) => {
            const active = pathname === to || pathname.startsWith(`${to}/`);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="size-4" />
                {label}
                {to === "/notifications" && unread > 0 && (
                  <span className="ml-auto rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                    {unread}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="mt-4 rounded-xl bg-sidebar-accent p-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-full bg-sidebar-primary text-xs font-bold text-sidebar-primary-foreground">
              {initials(session.profile?.full_name)}
            </div>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-semibold">{session.profile?.full_name ?? "Student"}</p>
              <p className="truncate text-[11px] text-sidebar-foreground/60">{session.profile?.student_id}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="mt-2 w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar/60 hover:text-sidebar-foreground">
            <LogOut className="size-4" /> Logout
          </Button>
        </div>
      </aside>

      <main className="flex-1 pb-24 lg:pb-8">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = pathname === to || pathname.startsWith(`${to}/`);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className={cn("size-5", active && "stroke-[2.4]")} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  right,
  back,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  back?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/95 px-4 py-3.5 backdrop-blur lg:px-8">
      <div className="mx-auto flex max-w-5xl items-center gap-3">
        {back}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold">{title}</h1>
          {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {right}
      </div>
    </header>
  );
}

export function NotificationBell() {
  const { session } = useSession();
  const { data: unread = 0 } = useUnreadCount(session.userId);
  return (
    <Link
      to="/notifications"
      className="relative flex size-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground transition-colors hover:bg-accent"
      aria-label="Notifications"
    >
      <Bell className="size-5" />
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
          {unread}
        </span>
      )}
    </Link>
  );
}
