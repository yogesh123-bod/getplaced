import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AdminShell } from "@/components/placement/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/placement/StatusBadge";
import { lpa, shortDate, timeAgo } from "@/lib/format";
import { Briefcase, FileSpreadsheet, Megaphone, Target, UserPlus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  head: () => ({
    meta: [
      { title: "Placement Cell Dashboard — Campus Placement Portal" },
      {
        name: "description",
        content: "Placement cell overview: students, drives, applications, shortlists and placement rate.",
      },
      { property: "og:title", content: "Placement Cell Dashboard — Campus Placement Portal" },
      { property: "og:description", content: "Students, drives, applications and placement statistics." },
    ],
  }),
  component: AdminDashboard,
});

const QUICK_ACTIONS = [
  { to: "/admin/announcements", label: "Create Announcement", icon: Megaphone },
  { to: "/admin/jobs", label: "Add Placement", icon: Briefcase },
  { to: "/admin/students", label: "Add Student", icon: UserPlus },
  { to: "/admin/students/import", label: "Upload Students CSV", icon: FileSpreadsheet },
  { to: "/admin/tests", label: "Create Practice Test", icon: Target },
] as const;

function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: async () => {
      const [students, companies, jobs, applications, tests, attempts, recentApps, recentStudents, logs] =
        await Promise.all([
          supabase.from("student_profiles").select("user_id, full_name, placement_status, branch, is_active, created_at"),
          supabase.from("companies").select("id"),
          supabase.from("jobs").select("id, title, status, package_lpa, deadline, created_at, companies(name)"),
          supabase.from("applications").select("id, status, applied_at, user_id, job_id"),
          supabase.from("tests").select("id, published"),
          supabase.from("test_attempts").select("id, percentage, submitted_at, user_id"),
          supabase
            .from("applications")
            .select("id, status, applied_at, student_profiles!inner(full_name), jobs(title, companies(name))")
            .order("applied_at", { ascending: false })
            .limit(6),
          supabase
            .from("student_profiles")
            .select("user_id, full_name, student_id, created_at")
            .order("created_at", { ascending: false })
            .limit(6),
          supabase.from("audit_logs").select("action, details, created_at").order("created_at", { ascending: false }).limit(6),
        ]);
      if (students.error) throw students.error;
      return {
        students: students.data ?? [],
        companies: companies.data ?? [],
        jobs: jobs.data ?? [],
        applications: applications.data ?? [],
        tests: tests.data ?? [],
        attempts: attempts.data ?? [],
        recentApps: (recentApps.data ?? []) as unknown as {
          id: string;
          status: string;
          applied_at: string;
          student_profiles: { full_name: string } | null;
          jobs: { title: string; companies: { name: string } | null } | null;
        }[],
        recentStudents: recentStudents.data ?? [],
        logs: logs.data ?? [],
      };
    },
  });

  if (isLoading || !data) {
    return (
      <AdminShell title="Dashboard" subtitle="Placement cell overview">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      </AdminShell>
    );
  }

  const active = data.students.filter((s) => s.is_active);
  const placed = active.filter((s) => s.placement_status === "Placed").length;
  const openDrives = data.jobs.filter((j) => j.status === "open").length;
  const today = new Date().toISOString().slice(0, 10);
  const openForApplications = data.jobs.filter((j) => j.status === "open" && j.deadline >= today).length;
  const packages = data.jobs.map((j) => Number(j.package_lpa));
  const avgPackage = packages.length ? packages.reduce((s, p) => s + p, 0) / packages.length : 0;
  const topPackage = packages.length ? Math.max(...packages) : 0;

  const byBranch = Object.entries(
    active.reduce<Record<string, { total: number; placed: number }>>((acc, s) => {
      const row = acc[s.branch] ?? { total: 0, placed: 0 };
      row.total += 1;
      if (s.placement_status === "Placed") row.placed += 1;
      acc[s.branch] = row;
      return acc;
    }, {}),
  );

  const cards = [
    ["Total Students", String(data.students.length)],
    ["Active Students", String(active.length)],
    ["Total Companies", String(data.companies.length)],
    ["Active Drives", String(openDrives)],
    ["Open for Applications", String(openForApplications)],
    ["Applications", String(data.applications.length)],
    ["Students Placed", `${placed} (${active.length ? Math.round((placed / active.length) * 100) : 0}%)`],
    ["Tests / Attempts", `${data.tests.length} / ${data.attempts.length}`],
    ["Avg / Top Package", `${lpa(avgPackage)} / ${lpa(topPackage)}`],
  ];

  const deadlineSoon = data.jobs
    .filter((j) => j.status === "open" && j.deadline >= today)
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .slice(0, 4);

  return (
    <AdminShell title="Dashboard" subtitle="Placement cell overview">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cards.map(([label, value]) => (
          <div key={label} className="card-soft p-4">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-1 text-xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      <section className="card-soft mt-4 p-4">
        <h2 className="text-sm font-bold">Quick actions</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {QUICK_ACTIONS.map(({ to, label, icon: Icon }) => (
            <Button key={to} asChild size="sm" variant="secondary">
              <Link to={to}>
                <Icon className="size-4" /> {label}
              </Link>
            </Button>
          ))}
        </div>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="card-soft p-4">
          <h2 className="text-sm font-bold">Recent placement activity</h2>
          <ul className="mt-3 space-y-2 text-xs">
            {data.logs.length === 0 && <li className="text-muted-foreground">No admin activity yet.</li>}
            {data.logs.map((l, i) => (
              <li key={i} className="flex items-start justify-between gap-3">
                <span>
                  <span className="font-semibold">{l.action.replace(/[._]/g, " ")}</span>
                  {l.details ? ` — ${l.details}` : ""}
                </span>
                <span className="shrink-0 text-muted-foreground">{timeAgo(l.created_at)}</span>
              </li>
            ))}
          </ul>
          <h3 className="mt-4 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Deadlines approaching
          </h3>
          <ul className="mt-2 space-y-1.5 text-xs">
            {deadlineSoon.length === 0 && <li className="text-muted-foreground">No open drives.</li>}
            {deadlineSoon.map((j) => (
              <li key={j.id} className="flex items-center justify-between gap-3">
                <span className="truncate">
                  {(j.companies as { name: string } | null)?.name ?? "—"} · {j.title}
                </span>
                <span className="shrink-0 text-muted-foreground">{shortDate(j.deadline)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card-soft p-4">
          <h2 className="text-sm font-bold">Recent student activity</h2>
          <ul className="mt-3 space-y-2 text-xs">
            {data.recentApps.length === 0 && <li className="text-muted-foreground">No applications yet.</li>}
            {data.recentApps.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3">
                <span className="truncate">
                  {a.student_profiles?.full_name ?? "Student"} → {a.jobs?.companies?.name ?? "—"} ·{" "}
                  {a.jobs?.title ?? ""}
                </span>
                <StatusBadge status={a.status} />
              </li>
            ))}
          </ul>
          <h3 className="mt-4 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            New student accounts
          </h3>
          <ul className="mt-2 space-y-1.5 text-xs">
            {data.recentStudents.length === 0 && <li className="text-muted-foreground">No students yet.</li>}
            {data.recentStudents.map((s) => (
              <li key={s.user_id} className="flex items-center justify-between gap-3">
                <span className="truncate">
                  {s.full_name} · {s.student_id}
                </span>
                <span className="shrink-0 text-muted-foreground">{timeAgo(s.created_at)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card-soft mt-4 p-4">
        <h2 className="text-sm font-bold">Placements by branch</h2>
        <div className="mt-3 space-y-3">
          {byBranch.length === 0 && <p className="text-xs text-muted-foreground">No student data yet.</p>}
          {byBranch.map(([branch, row]) => {
            const pct = row.total ? Math.round((row.placed / row.total) * 100) : 0;
            return (
              <div key={branch}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold">{branch}</span>
                  <span className="text-muted-foreground">
                    {row.placed}/{row.total} ({pct}%)
                  </span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-secondary">
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </AdminShell>
  );
}
