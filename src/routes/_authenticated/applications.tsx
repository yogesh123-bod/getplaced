import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { StudentShell, PageHeader, NotificationBell } from "@/components/placement/StudentShell";
import { CompanyLogo } from "@/components/placement/CompanyLogo";
import { StatusBadge } from "@/components/placement/StatusBadge";
import { StatusTimeline } from "@/components/placement/StatusTimeline";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { lpa, shortDate } from "@/lib/format";
import { APPLICATION_STATUSES } from "@/lib/eligibility";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/applications")({
  head: () => ({
    meta: [
      { title: "My Applications — Campus Placement Portal" },
      {
        name: "description",
        content: "Track every placement application you submitted and its current shortlisting status.",
      },
      { property: "og:title", content: "My Applications — Campus Placement Portal" },
      { property: "og:description", content: "Track your placement applications and status timeline." },
    ],
  }),
  component: ApplicationsPage,
});

function ApplicationsPage() {
  const { session } = useSession();
  const [tab, setTab] = useState("All");

  const { data, isLoading } = useQuery({
    queryKey: ["my-applications", session.userId],
    enabled: !!session.userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("*, jobs(title, role_tag, package_lpa, location, companies(name))")
        .eq("user_id", session.userId!)
        .order("applied_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const rows = (data ?? []).filter((a) => tab === "All" || a.status === tab);

  return (
    <StudentShell>
      <PageHeader
        title="Application History"
        subtitle={`${data?.length ?? 0} applications`}
        right={<NotificationBell />}
      />
      <div className="mx-auto max-w-5xl px-4 py-4 lg:px-8">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full overflow-x-auto">
            {["All", ...APPLICATION_STATUSES].map((s) => (
              <TabsTrigger key={s} value={s} className="whitespace-nowrap text-xs">
                {s}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="mt-4 space-y-3">
          {isLoading ? (
            <>
              <Skeleton className="h-36 w-full rounded-2xl" />
              <Skeleton className="h-36 w-full rounded-2xl" />
            </>
          ) : rows.length === 0 ? (
            <div className="card-soft px-4 py-10 text-center">
              <p className="text-sm font-semibold">No applications yet.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Apply to a placement drive and track its progress here.
              </p>
              <Button asChild size="sm" className="mt-4">
                <Link to="/jobs">Browse placements</Link>
              </Button>
            </div>
          ) : (
            rows.map((a) => {
              const job = a.jobs as {
                title: string;
                role_tag: string | null;
                package_lpa: number;
                location: string;
                companies: { name: string } | null;
              } | null;
              const company = job?.companies?.name ?? "Company";
              return (
                <article key={a.id} className="card-soft p-4">
                  <div className="flex items-start gap-3">
                    <CompanyLogo name={company} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-bold">{company}</h3>
                          <p className="truncate text-xs text-muted-foreground">
                            {job?.role_tag ?? job?.title}
                          </p>
                        </div>
                        <StatusBadge status={a.status} className="shrink-0" />
                      </div>
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">{lpa(job?.package_lpa)}</span> ·
                        Applied {shortDate(a.applied_at)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <StatusTimeline status={a.status} />
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>
    </StudentShell>
  );
}
