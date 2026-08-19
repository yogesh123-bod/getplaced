import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowUpDown, Filter, MapPin, Search, Users } from "lucide-react";
import { StudentShell, PageHeader, NotificationBell } from "@/components/placement/StudentShell";
import { CompanyLogo } from "@/components/placement/CompanyLogo";
import { EligibilityBadge } from "@/components/placement/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { evaluateEligibility } from "@/lib/eligibility";
import { lpa, shortDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export const Route = createFileRoute("/_authenticated/jobs/")({
  head: () => ({
    meta: [
      { title: "Placement Drives — Campus Placement Portal" },
      {
        name: "description",
        content:
          "Browse open campus placement drives with package, location, branch and CGPA eligibility calculated for your profile.",
      },
      { property: "og:title", content: "Placement Drives — Campus Placement Portal" },
      {
        property: "og:description",
        content: "Browse open placement drives with automatic eligibility checks.",
      },
    ],
  }),
  component: JobsPage,
});

export function useJobsWithStatus() {
  const { session } = useSession();
  const jobs = useQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*, companies(name, logo_color)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const apps = useQuery({
    queryKey: ["my-applications", session.userId],
    enabled: !!session.userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("*")
        .eq("user_id", session.userId!);
      if (error) throw error;
      return data;
    },
  });
  return { jobs, apps, session };
}

function JobsPage() {
  const { jobs, apps, session } = useJobsWithStatus();
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("all");
  const [eligibility, setEligibility] = useState("all");
  const [status, setStatus] = useState("all");
  const [minPackage, setMinPackage] = useState("");
  const [sort, setSort] = useState("deadline");

  const rows = useMemo(() => {
    const student = session.profile;
    return (jobs.data ?? []).map((job) => {
      const company = (job.companies as { name: string } | null)?.name ?? "Company";
      const result = evaluateEligibility(job, student);
      const application = (apps.data ?? []).find((a) => a.job_id === job.id);
      return { job, company, result, application };
    });
  }, [jobs.data, apps.data, session.profile]);

  const locations = useMemo(
    () => Array.from(new Set(rows.map((r) => r.job.location))).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let out = rows.filter(({ job, company, result, application }) => {
      if (q && !`${company} ${job.title} ${job.role_tag ?? ""} ${job.location}`.toLowerCase().includes(q))
        return false;
      if (location !== "all" && job.location !== location) return false;
      if (eligibility === "eligible" && !result.eligible) return false;
      if (eligibility === "not_eligible" && result.eligible) return false;
      if (status === "applied" && !application) return false;
      if (status === "not_applied" && application) return false;
      if (minPackage && Number(job.package_lpa) < Number(minPackage)) return false;
      return true;
    });
    out = out.sort((a, b) => {
      if (sort === "package") return Number(b.job.package_lpa) - Number(a.job.package_lpa);
      if (sort === "company") return a.company.localeCompare(b.company);
      return a.job.deadline.localeCompare(b.job.deadline);
    });
    return out;
  }, [rows, search, location, eligibility, status, minPackage, sort]);

  const filters = (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Location</Label>
        <Select value={location} onValueChange={setLocation}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All locations</SelectItem>
            {locations.map((l) => (
              <SelectItem key={l} value={l}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Eligibility</Label>
        <Select value={eligibility} onValueChange={setEligibility}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All drives</SelectItem>
            <SelectItem value="eligible">Eligible only</SelectItem>
            <SelectItem value="not_eligible">Not eligible</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Application status</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any</SelectItem>
            <SelectItem value="applied">Applied</SelectItem>
            <SelectItem value="not_applied">Not applied</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pkg">Minimum package (LPA)</Label>
        <Input
          id="pkg"
          type="number"
          min={0}
          max={100}
          step="0.5"
          value={minPackage}
          onChange={(e) => setMinPackage(e.target.value)}
          placeholder="e.g. 4"
        />
      </div>
      <Button
        variant="secondary"
        className="w-full"
        onClick={() => {
          setLocation("all");
          setEligibility("all");
          setStatus("all");
          setMinPackage("");
        }}
      >
        Clear filters
      </Button>
    </div>
  );

  return (
    <StudentShell>
      <PageHeader title="Placements" subtitle="Campus recruitment drives" right={<NotificationBell />} />
      <div className="mx-auto max-w-5xl px-4 py-4 lg:px-8">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              maxLength={80}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search jobs, companies, roles..."
              className="pl-9"
              aria-label="Search jobs"
            />
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="secondary" size="icon" aria-label="Filters">
                <Filter className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 p-5">
              <SheetHeader className="px-0">
                <SheetTitle>Filter drives</SheetTitle>
              </SheetHeader>
              {filters}
            </SheetContent>
          </Sheet>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-auto gap-1.5" aria-label="Sort">
              <ArrowUpDown className="size-4" />
              <span className="hidden sm:inline">
                {sort === "deadline" ? "Deadline" : sort === "package" ? "Package" : "Company"}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="deadline">Deadline</SelectItem>
              <SelectItem value="package">Highest package</SelectItem>
              <SelectItem value="company">Company A–Z</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mt-4 space-y-3">
          {jobs.isLoading ? (
            <>
              <Skeleton className="h-44 w-full rounded-2xl" />
              <Skeleton className="h-44 w-full rounded-2xl" />
            </>
          ) : filtered.length === 0 ? (
            <div className="card-soft px-4 py-10 text-center">
              <p className="text-sm font-semibold">No active placement opportunities right now.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Try clearing filters or check back after the next drive is published.
              </p>
            </div>
          ) : (
            filtered.map(({ job, company, result, application }) => (
              <article key={job.id} className="card-soft p-4">
                <div className="flex items-start gap-3">
                  <CompanyLogo name={company} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-bold">{company}</h3>
                        <p className="truncate text-xs text-muted-foreground">
                          {job.role_tag ?? job.title}
                        </p>
                      </div>
                      <EligibilityBadge
                        eligible={result.eligible}
                        applied={!!application}
                        className="shrink-0"
                      />
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                      <span className="font-semibold">{lpa(job.package_lpa)}</span>
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <MapPin className="size-3.5" /> {job.location}
                      </span>
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Users className="size-3.5" /> {job.openings}
                      </span>
                    </div>

                    <dl className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                      <div>
                        <span className="font-semibold text-foreground">Branch: </span>
                        {job.branches.join(", ")}
                      </div>
                      <div>
                        <span className="font-semibold text-foreground">CGPA: </span>≥{" "}
                        {Number(job.min_cgpa).toFixed(1)}
                        <span className="mx-1.5">·</span>
                        <span className="font-semibold text-foreground">Backlogs: </span>
                        {job.max_backlogs === 0 ? "No active backlogs" : `Max ${job.max_backlogs} active`}
                      </div>
                      <div>
                        <span className="font-semibold text-foreground">Apply before: </span>
                        {shortDate(job.deadline)}
                      </div>
                    </dl>

                    {!result.eligible && result.reasons[0] && (
                      <p className="mt-2 rounded-lg bg-destructive/8 px-2.5 py-1.5 text-[11px] font-medium text-destructive">
                        Reason: {result.reasons[0]}
                      </p>
                    )}

                    <div className="mt-3 flex gap-2">
                      <Button asChild variant="secondary" size="sm" className="flex-1">
                        <Link to="/jobs/$id" params={{ id: job.id }}>
                          View Details
                        </Link>
                      </Button>
                      {application ? (
                        <Button size="sm" variant="outline" className="flex-1 text-success" disabled>
                          Applied ✓
                        </Button>
                      ) : result.eligible ? (
                        <Button asChild size="sm" className="flex-1">
                          <Link to="/jobs/$id" params={{ id: job.id }}>
                            Apply Now
                          </Link>
                        </Button>
                      ) : (
                        <Button size="sm" className="flex-1" disabled>
                          Not Eligible
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </StudentShell>
  );
}
