import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AdminShell } from "@/components/placement/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

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

function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: async () => {
      const [students, companies, jobs, applications] = await Promise.all([
        supabase.from("student_profiles").select("placement_status, branch, is_active"),
        supabase.from("companies").select("id"),
        supabase.from("jobs").select("id, status, package_lpa"),
        supabase.from("applications").select("status, job_id"),
      ]);
      if (students.error) throw students.error;
      return {
        students: students.data ?? [],
        companies: companies.data ?? [],
        jobs: jobs.data ?? [],
        applications: applications.data ?? [],
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
  const shortlisted = data.applications.filter((a) => a.status === "Shortlisted").length;
  const selected = data.applications.filter((a) => a.status === "Selected").length;
  const openDrives = data.jobs.filter((j) => j.status === "open").length;
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
    ["Total Students", String(active.length)],
    ["Total Companies", String(data.companies.length)],
    ["Active Drives", String(openDrives)],
    ["Applications", String(data.applications.length)],
    ["Shortlisted", String(shortlisted)],
    ["Selected", String(selected)],
    ["Placement %", `${active.length ? Math.round((placed / active.length) * 100) : 0}%`],
    ["Avg / Top Package", `₹${avgPackage.toFixed(2)} / ₹${topPackage.toFixed(2)} LPA`],
  ];

  return (
    <AdminShell title="Dashboard" subtitle="Placement cell overview">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([label, value]) => (
          <div key={label} className="card-soft p-4">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-1 text-xl font-bold">{value}</p>
          </div>
        ))}
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
