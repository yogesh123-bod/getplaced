import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowLeft,
  Bookmark,
  Briefcase,
  CalendarClock,
  Check,
  MapPin,
  Share2,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { StudentShell, PageHeader } from "@/components/placement/StudentShell";
import { CompanyLogo } from "@/components/placement/CompanyLogo";
import { EligibilityBadge } from "@/components/placement/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { evaluateEligibility } from "@/lib/eligibility";
import { lpa, shortDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/jobs/$id")({
  head: () => ({
    meta: [
      { title: "Drive Details — Campus Placement Portal" },
      {
        name: "description",
        content: "Full placement drive details: eligibility, selection process, package and deadline.",
      },
      { property: "og:title", content: "Drive Details — Campus Placement Portal" },
      { property: "og:description", content: "Eligibility, selection process and deadline for this drive." },
    ],
  }),
  component: JobDetailPage,
});

function JobDetailPage() {
  const { id } = Route.useParams();
  const { session } = useSession();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  const { data: job, isLoading } = useQuery({
    queryKey: ["job", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*, companies(name)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: application } = useQuery({
    queryKey: ["application", id, session.userId],
    enabled: !!session.userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("*")
        .eq("job_id", id)
        .eq("user_id", session.userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const apply = useMutation({
    mutationFn: async () => {
      if (!job || !session.userId) throw new Error("Not ready");
      const result = evaluateEligibility(job, session.profile);
      if (!result.eligible) throw new Error(result.reasons[0] ?? "You are not eligible for this drive");
      const { error } = await supabase
        .from("applications")
        .insert({ job_id: job.id, user_id: session.userId, status: "Applied" });
      if (error) throw error;
      await supabase.from("notifications").insert({
        user_id: session.userId,
        type: "application",
        title: "Application submitted",
        body: `Your application for ${company} — ${job.title} has been received.`,
        link: "/applications",
      });
    },
    onSuccess: () => {
      setConfirmOpen(false);
      toast.success("Application submitted successfully.");
      queryClient.invalidateQueries({ queryKey: ["application", id] });
      queryClient.invalidateQueries({ queryKey: ["my-applications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !job) {
    return (
      <StudentShell>
        <PageHeader title="Drive details" />
        <div className="mx-auto max-w-3xl space-y-3 px-4 py-5">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      </StudentShell>
    );
  }

  const company = (job.companies as { name: string } | null)?.name ?? "Company";
  const result = evaluateEligibility(job, session.profile);
  const applied = !!application;

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: `${company} — ${job.title}`, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard");
      }
    } catch {
      /* dismissed */
    }
  };

  return (
    <StudentShell>
      <PageHeader
        title={company}
        subtitle={job.role_tag ?? job.title}
        back={
          <button
            onClick={() => navigate({ to: "/jobs" })}
            aria-label="Back to placements"
            className="flex size-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground hover:bg-accent"
          >
            <ArrowLeft className="size-4" />
          </button>
        }
        right={
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                setBookmarked((b) => !b);
                toast.success(bookmarked ? "Removed from saved" : "Saved for later");
              }}
              aria-label="Bookmark drive"
              className="flex size-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground hover:bg-accent"
            >
              <Bookmark className={cn("size-4", bookmarked && "fill-primary text-primary")} />
            </button>
            <button
              onClick={share}
              aria-label="Share drive"
              className="flex size-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground hover:bg-accent"
            >
              <Share2 className="size-4" />
            </button>
          </div>
        }
      />

      <div className="mx-auto max-w-3xl space-y-4 px-4 py-5 pb-28 lg:px-8">
        <section className="card-soft p-4">
          <div className="flex items-start gap-3">
            <CompanyLogo name={company} size="lg" />
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold">{company}</h2>
              <p className="text-sm text-muted-foreground">{job.title}</p>
              <EligibilityBadge eligible={result.eligible} applied={applied} className="mt-2" />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <Info icon={<Briefcase className="size-4" />} label="Package" value={lpa(job.package_lpa)} />
            <Info icon={<MapPin className="size-4" />} label="Location" value={job.location} />
            <Info icon={<Users className="size-4" />} label="Openings" value={job.openings} />
            <Info
              icon={<CalendarClock className="size-4" />}
              label="Deadline"
              value={shortDate(job.deadline)}
            />
          </div>
        </section>

        <section className="card-soft p-4">
          <h3 className="text-sm font-bold">Eligibility</h3>
          <ul className="mt-3 space-y-2">
            {result.checks.map((c) => (
              <li key={c.label} className="flex items-center gap-2.5 text-sm">
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full",
                    c.ok ? "bg-success/15 text-success" : "bg-destructive/12 text-destructive",
                  )}
                >
                  {c.ok ? <Check className="size-3" /> : <X className="size-3" />}
                </span>
                <span className="font-medium">{c.label}</span>
                <span className="ml-auto text-right text-xs text-muted-foreground">{c.detail}</span>
              </li>
            ))}
            {job.skills.length > 0 && (
              <li className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
                <span className="font-medium">Skills:</span>
                {job.skills.map((s) => (
                  <span key={s} className="rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground">
                    {s}
                  </span>
                ))}
              </li>
            )}
          </ul>
          {!result.eligible && (
            <div className="mt-3 rounded-xl bg-destructive/8 p-3">
              <p className="text-xs font-bold text-destructive">Not Eligible</p>
              <ul className="mt-1 space-y-0.5 text-xs text-destructive/90">
                {result.reasons.map((r) => (
                  <li key={r}>• {r}</li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="card-soft p-4">
          <h3 className="text-sm font-bold">Job Description</h3>
          <p
            className={cn(
              "mt-2 whitespace-pre-line text-sm text-muted-foreground",
              !expanded && "line-clamp-5",
            )}
          >
            {job.description}
          </p>
          {job.description.length > 260 && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-1.5 text-xs font-semibold text-primary hover:underline"
            >
              {expanded ? "Read less" : "Read more"}
            </button>
          )}
        </section>

        <section className="card-soft p-4">
          <h3 className="text-sm font-bold">Selection Process</h3>
          <ol className="mt-3 space-y-3">
            {job.selection_process.map((step, i) => (
              <li key={step} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="flex size-6 items-center justify-center rounded-full gradient-brand text-[11px] font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  {i < job.selection_process.length - 1 && <span className="mt-1 h-6 w-0.5 bg-border" />}
                </div>
                <p className="pt-0.5 text-sm font-medium">{step}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="card-soft p-4">
          <h3 className="text-sm font-bold">Important Information</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <Row label="Application deadline" value={shortDate(job.deadline)} />
            <Row label="Applications open" value={shortDate(job.open_date)} />
            <Row label="Job type" value={job.job_type} />
            <Row label="Work location" value={job.location} />
            <Row label="Package" value={lpa(job.package_lpa)} />
            <Row label="Openings" value={job.openings} />
          </dl>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-border bg-card/95 px-4 py-3 backdrop-blur lg:bottom-0 lg:pl-72">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="hidden flex-1 sm:block">
            <p className="text-sm font-bold">{lpa(job.package_lpa)}</p>
            <p className="text-xs text-muted-foreground">Apply before {shortDate(job.deadline)}</p>
          </div>
          {applied ? (
            <Button asChild variant="outline" className="flex-1 sm:flex-none">
              <Link to="/applications">Applied ✓ · View status</Link>
            </Button>
          ) : (
            <Button
              className="flex-1 sm:flex-none sm:px-10"
              disabled={!result.eligible || job.status !== "open"}
              onClick={() => setConfirmOpen(true)}
            >
              {job.status !== "open" ? "Drive closed" : result.eligible ? "Apply Now" : "Not Eligible"}
            </Button>
          )}
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm application</DialogTitle>
            <DialogDescription>
              Are you sure you want to apply for {company} — {job.role_tag ?? job.title}?
            </DialogDescription>
          </DialogHeader>
          <dl className="space-y-2 rounded-xl bg-secondary p-3 text-sm">
            <Row label="Company" value={company} />
            <Row label="Role" value={job.title} />
            <Row label="Package" value={lpa(job.package_lpa)} />
            <Row label="Deadline" value={shortDate(job.deadline)} />
          </dl>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => apply.mutate()} disabled={apply.isPending}>
              {apply.isPending ? "Submitting..." : "Confirm Application"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </StudentShell>
  );
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-secondary px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-0.5 text-sm font-bold">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-semibold">{value}</dd>
    </div>
  );
}
