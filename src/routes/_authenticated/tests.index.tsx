import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Clock, ListChecks, Target } from "lucide-react";
import { StudentShell, PageHeader, NotificationBell } from "@/components/placement/StudentShell";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/tests/")({
  head: () => ({
    meta: [
      { title: "Test Center — Campus Placement Portal" },
      {
        name: "description",
        content:
          "Practice aptitude, reasoning, verbal and technical tests with scores, accuracy and attempt history.",
      },
      { property: "og:title", content: "Test Center — Campus Placement Portal" },
      { property: "og:description", content: "Practice aptitude and technical tests with instant scoring." },
    ],
  }),
  component: TestCenterPage,
});

export const CATEGORIES = [
  "Quantitative Aptitude",
  "Logical Reasoning",
  "Verbal Ability",
  "Technical",
  "Coding",
] as const;

function TestCenterPage() {
  const { session } = useSession();
  const [tab, setTab] = useState("All");

  const tests = useQuery({
    queryKey: ["tests", session.profile?.course],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tests")
        .select("*, test_questions(id)")
        .eq("published", true)
        .order("category");
      if (error) throw error;
      return data;
    },
  });

  const attempts = useQuery({
    queryKey: ["test-attempts", session.userId],
    enabled: !!session.userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("test_attempts")
        .select("*")
        .eq("user_id", session.userId!)
        .not("submitted_at", "is", null)
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const stats = useMemo(() => {
    const list = attempts.data ?? [];
    const avg = list.length ? list.reduce((s, a) => s + Number(a.percentage), 0) / list.length : 0;
    const best = list.length ? Math.max(...list.map((a) => Number(a.percentage))) : 0;
    const questions = list.reduce((s, a) => s + a.total_questions, 0);
    const accuracy = list.length ? list.reduce((s, a) => s + Number(a.accuracy), 0) / list.length : 0;
    return { attempted: list.length, avg, best, questions, accuracy };
  }, [attempts.data]);

  const course = session.profile?.course ?? null;
  const visible = (tests.data ?? []).filter(
    (t) => (!t.course || t.course === course) && (tab === "All" || t.category === tab),
  );

  return (
    <StudentShell>
      <PageHeader title="Test Center" subtitle="Practice for campus drives" right={<NotificationBell />} />
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-4 lg:px-8">
        <section className="card-soft gradient-brand p-4 text-primary-foreground">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Your performance</p>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <Stat label="Tests attempted" value={String(stats.attempted)} />
            <Stat label="Average score" value={`${Math.round(stats.avg)}%`} />
            <Stat label="Best score" value={`${Math.round(stats.best)}%`} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Stat label="Total questions" value={String(stats.questions)} />
            <Stat label="Average accuracy" value={`${Math.round(stats.accuracy)}%`} />
          </div>
        </section>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full overflow-x-auto">
            {["All", ...CATEGORIES].map((c) => (
              <TabsTrigger key={c} value={c} className="whitespace-nowrap text-xs">
                {c}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="space-y-3">
          {tests.isLoading ? (
            <>
              <Skeleton className="h-28 w-full rounded-2xl" />
              <Skeleton className="h-28 w-full rounded-2xl" />
            </>
          ) : visible.length === 0 ? (
            <div className="card-soft px-4 py-10 text-center">
              <Target className="mx-auto size-6 text-muted-foreground" />
              <p className="mt-2 text-sm font-semibold">No tests available for your course.</p>
            </div>
          ) : (
            visible.map((t) => {
              const questionCount = (t.test_questions as { id: string }[] | null)?.length ?? 0;
              const mine = (attempts.data ?? []).filter((a) => a.test_id === t.id);
              const best = mine.length ? Math.max(...mine.map((a) => Number(a.percentage))) : null;
              return (
                <article key={t.id} className="card-soft p-4">
                  <span className="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                    {t.category}
                  </span>
                  <h3 className="mt-2 text-sm font-bold">{t.name}</h3>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <ListChecks className="size-3.5" /> {questionCount} Questions
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3.5" /> {t.duration_min} Min
                    </span>
                    <span>{t.difficulty}</span>
                  </p>
                  <div className="mt-2 flex items-center gap-4 text-xs">
                    <span className="font-semibold text-success">
                      Best Score: {best === null ? "—" : `${Math.round(best)}%`}
                    </span>
                    <span className="text-muted-foreground">{mine.length} Attempts</span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button asChild variant="secondary" size="sm" className="flex-1">
                      <Link to="/tests/$id" params={{ id: t.id }}>
                        Details
                      </Link>
                    </Button>
                    <Button asChild size="sm" className="flex-1" disabled={questionCount === 0}>
                      <Link to="/tests/$id/attempt" params={{ id: t.id }}>
                        Start Test
                      </Link>
                    </Button>
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-primary-foreground/12 px-3 py-2.5">
      <p className="text-lg font-bold leading-tight">{value}</p>
      <p className="text-[10px] uppercase tracking-wide opacity-80">{label}</p>
    </div>
  );
}
