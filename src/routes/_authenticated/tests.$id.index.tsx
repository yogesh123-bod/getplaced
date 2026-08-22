import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Clock, ListChecks, TrendingUp } from "lucide-react";
import { StudentShell, PageHeader } from "@/components/placement/StudentShell";
import { supabase } from "@/integrations/supabase/client";
import { getQuestionCounts } from "@/lib/tests.functions";
import { useSession } from "@/lib/session";
import { shortDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/tests/$id/")({
  head: () => ({
    meta: [
      { title: "Practice Test — Campus Placement Portal" },
      { name: "description", content: "Practice test overview, attempt history and score trend." },
      { property: "og:title", content: "Practice Test — Campus Placement Portal" },
      { property: "og:description", content: "Test overview, attempt history and score trend." },
    ],
  }),
  component: TestOverviewPage,
});

function TestOverviewPage() {
  const { id } = Route.useParams();
  const { session } = useSession();
  const navigate = useNavigate();

  const loadCounts = useServerFn(getQuestionCounts);
  const counts = useQuery({
    queryKey: ["test-question-counts"],
    queryFn: () => loadCounts({}),
  });

  const test = useQuery({
    queryKey: ["test", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tests")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const attempts = useQuery({
    queryKey: ["test-attempts", session.userId, id],
    enabled: !!session.userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("test_attempts")
        .select("*")
        .eq("user_id", session.userId!)
        .eq("test_id", id)
        .not("submitted_at", "is", null)
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (test.isLoading || !test.data) {
    return (
      <StudentShell>
        <PageHeader title="Practice test" />
        <div className="mx-auto max-w-3xl px-4 py-5">
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      </StudentShell>
    );
  }

  const t = test.data;
  const questionCount = counts.data?.[t.id] ?? 0;
  const list = attempts.data ?? [];
  const best = list.length ? Math.max(...list.map((a) => Number(a.percentage))) : null;

  return (
    <StudentShell>
      <PageHeader
        title={t.name}
        subtitle={t.category}
        back={
          <button
            onClick={() => navigate({ to: "/tests" })}
            aria-label="Back to test center"
            className="flex size-9 items-center justify-center rounded-full bg-secondary hover:bg-accent"
          >
            <ArrowLeft className="size-4" />
          </button>
        }
      />
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-4 lg:px-8">
        <section className="card-soft p-4">
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-xl bg-secondary px-3 py-2.5">
              <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <ListChecks className="size-3.5" /> Questions
              </p>
              <p className="mt-0.5 font-bold">{questionCount}</p>
            </div>
            <div className="rounded-xl bg-secondary px-3 py-2.5">
              <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock className="size-3.5" /> Duration
              </p>
              <p className="mt-0.5 font-bold">{t.duration_min} min</p>
            </div>
            <div className="rounded-xl bg-secondary px-3 py-2.5">
              <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <TrendingUp className="size-3.5" /> Best
              </p>
              <p className="mt-0.5 font-bold">{best === null ? "—" : `${Math.round(best)}%`}</p>
            </div>
          </div>
          <Button asChild className="mt-4 w-full">
            <Link to="/tests/$id/attempt" params={{ id }}>
              {list.length ? "Re-attempt Test" : "Start Test"}
            </Link>
          </Button>
        </section>

        <section className="card-soft p-4">
          <h3 className="text-sm font-bold">Attempt history</h3>
          {list.length === 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">No attempts yet — take the test to begin.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {list.map((a, i) => (
                <li key={a.id} className="flex items-center gap-3 rounded-xl bg-secondary px-3 py-2.5 text-sm">
                  <span className="font-semibold">#{list.length - i}</span>
                  <span className="text-muted-foreground">{shortDate(a.submitted_at)}</span>
                  <span className="ml-auto font-bold">
                    {a.correct_count}/{a.total_questions}
                  </span>
                  <span className="w-12 text-right font-semibold text-primary">
                    {Math.round(Number(a.percentage))}%
                  </span>
                </li>
              ))}
            </ul>
          )}
          {list.length > 1 && (
            <p className="mt-3 text-xs text-muted-foreground">
              Score trend:{" "}
              {Number(list[0]!.percentage) >= Number(list[list.length - 1]!.percentage)
                ? "improving 📈"
                : "needs practice 📉"}
            </p>
          )}
        </section>
      </div>
    </StudentShell>
  );
}
