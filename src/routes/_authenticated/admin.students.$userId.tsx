import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminShell } from "@/components/placement/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/placement/StatusBadge";
import { CompanyLogo } from "@/components/placement/CompanyLogo";
import { shortDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/students/$userId")({
  head: () => ({
    meta: [
      { title: "Student Profile — Placement Cell" },
      { name: "description", content: "Academic, placement, application and practice-test record for a student." },
      { property: "og:title", content: "Student Profile — Placement Cell" },
      { property: "og:description", content: "Full student placement record." },
    ],
  }),
  component: Page,
});

function Page() {
  const { userId } = Route.useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-student", userId],
    queryFn: async () => {
      const [profile, apps, attempts] = await Promise.all([
        supabase.from("student_profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase
          .from("applications")
          .select("id, status, applied_at, jobs(title, package_lpa, companies(name))")
          .eq("user_id", userId)
          .order("applied_at", { ascending: false }),
        supabase
          .from("test_attempts")
          .select("id, percentage, accuracy, submitted_at, correct_count, total_questions, tests(name)")
          .eq("user_id", userId)
          .order("started_at", { ascending: false }),
      ]);
      if (profile.error) throw profile.error;
      return {
        profile: profile.data,
        apps: (apps.data ?? []) as unknown as {
          id: string;
          status: string;
          applied_at: string;
          jobs: { title: string; package_lpa: number; companies: { name: string } | null } | null;
        }[],
        attempts: (attempts.data ?? []) as unknown as {
          id: string;
          percentage: number;
          accuracy: number;
          submitted_at: string | null;
          correct_count: number;
          total_questions: number;
          tests: { name: string } | null;
        }[],
      };
    },
  });

  const downloadResume = async (path: string) => {
    const { data, error } = await supabase.storage.from("resumes").createSignedUrl(path, 120);
    if (error || !data) {
      toast.error("Could not open the resume file.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  };

  if (isLoading) {
    return (
      <AdminShell title="Student profile">
        <Skeleton className="h-64 w-full rounded-2xl" />
      </AdminShell>
    );
  }

  const p = data?.profile;
  if (!p) {
    return (
      <AdminShell title="Student profile">
        <p className="card-soft px-4 py-10 text-center text-sm text-muted-foreground">
          This student record no longer exists.{" "}
          <Link to="/admin/students" className="underline">
            Back to students
          </Link>
        </p>
      </AdminShell>
    );
  }

  const selected = data.apps.filter((a) => a.status === "Selected");

  return (
    <AdminShell
      title={p.full_name}
      subtitle={`${p.student_id} · ${p.course}`}
      actions={
        <Button asChild variant="secondary" size="sm">
          <Link to="/admin/students">Back</Link>
        </Button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card-soft divide-y divide-border">
          <h2 className="px-4 py-3 text-sm font-bold">Personal &amp; academic</h2>
          {[
            ["Student ID", p.student_id],
            ["Email", p.email],
            ["Phone", p.phone ?? "—"],
            ["Course", p.course],
            ["Branch", p.branch],
            ["College", p.college],
            ["Batch", String(p.graduation_year)],
            ["CGPA", Number(p.cgpa).toFixed(2)],
            ["Backlogs", String(p.backlog_count)],
            ["Account", p.is_active ? "Active" : "Inactive"],
            ["Placement status", p.placement_status],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-muted-foreground">{label}</span>
              <span className="max-w-[60%] truncate font-semibold">{value}</span>
            </div>
          ))}
        </section>

        <div className="space-y-4">
          <section className="card-soft p-4">
            <h2 className="text-sm font-bold">Resume</h2>
            {p.resume_url ? (
              <div className="mt-2 flex items-center justify-between gap-3 text-xs">
                <span className="truncate">
                  {p.resume_name ?? "resume.pdf"}
                  {p.resume_size ? ` · ${(p.resume_size / 1024).toFixed(0)} KB` : ""}
                </span>
                <Button size="sm" variant="secondary" onClick={() => downloadResume(p.resume_url!)}>
                  View / download
                </Button>
              </div>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">No resume uploaded yet.</p>
            )}
            <h3 className="mt-4 text-xs font-bold uppercase tracking-wide text-muted-foreground">Skills</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(p.skills ?? []).length === 0 && <span className="text-xs text-muted-foreground">—</span>}
              {(p.skills ?? []).map((s) => (
                <span key={s} className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold">
                  {s}
                </span>
              ))}
            </div>
          </section>

          <section className="card-soft p-4">
            <h2 className="text-sm font-bold">Placement summary</h2>
            <div className="mt-2 grid grid-cols-3 gap-3 text-center">
              {[
                ["Applied", data.apps.length],
                ["Selected", selected.length],
                ["Tests", data.attempts.length],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-xl bg-secondary p-3">
                  <p className="text-lg font-bold">{value}</p>
                  <p className="text-[11px] text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
            {selected.length > 0 && (
              <p className="mt-3 text-xs text-muted-foreground">
                Selected at: {selected.map((s) => s.jobs?.companies?.name ?? "—").join(", ")}
              </p>
            )}
          </section>
        </div>
      </div>

      <section className="card-soft mt-4 p-4">
        <h2 className="text-sm font-bold">Applications</h2>
        {data.apps.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">No applications yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {data.apps.map((a) => (
              <li key={a.id} className="flex items-center gap-3 rounded-xl bg-secondary/60 p-3">
                <CompanyLogo name={a.jobs?.companies?.name ?? "—"} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{a.jobs?.companies?.name ?? "—"}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {a.jobs?.title ?? ""} · {shortDate(a.applied_at)}
                  </p>
                </div>
                <StatusBadge status={a.status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card-soft mt-4 p-4">
        <h2 className="text-sm font-bold">Practice test history</h2>
        {data.attempts.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">No attempts yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-secondary text-left uppercase tracking-wide text-muted-foreground">
                <tr>
                  {["Test", "Score", "Percentage", "Accuracy", "Date"].map((h) => (
                    <th key={h} className="px-3 py-2 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.attempts.map((t) => (
                  <tr key={t.id}>
                    <td className="px-3 py-2">{t.tests?.name ?? "—"}</td>
                    <td className="px-3 py-2">
                      {t.correct_count}/{t.total_questions}
                    </td>
                    <td className="px-3 py-2">{Number(t.percentage).toFixed(0)}%</td>
                    <td className="px-3 py-2">{Number(t.accuracy).toFixed(0)}%</td>
                    <td className="px-3 py-2 text-muted-foreground">{shortDate(t.submitted_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AdminShell>
  );
}
