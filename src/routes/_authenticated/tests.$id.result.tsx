import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Check, X } from "lucide-react";
import { z } from "zod";
import { StudentShell, PageHeader } from "@/components/placement/StudentShell";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { mmss } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/tests/$id/result")({
  validateSearch: z.object({ attempt: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Test Result — Campus Placement Portal" },
      { name: "description", content: "Score, accuracy and question-by-question review of your attempt." },
      { property: "og:title", content: "Test Result — Campus Placement Portal" },
      { property: "og:description", content: "Score, accuracy and question review for your attempt." },
    ],
  }),
  component: ResultPage,
});

function ResultPage() {
  const { id } = Route.useParams();
  const { attempt } = Route.useSearch();
  const { session } = useSession();
  const navigate = useNavigate();
  const [showAnswers, setShowAnswers] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["test-result", id, attempt, session.userId],
    enabled: !!session.userId,
    queryFn: async () => {
      const base = supabase.from("test_attempts").select("*");
      const { data: attempts, error } = attempt
        ? await base.eq("id", attempt).limit(1)
        : await base
            .eq("user_id", session.userId!)
            .eq("test_id", id)
            .not("submitted_at", "is", null)
            .order("submitted_at", { ascending: false })
            .limit(1);
      if (error) throw error;
      const row = attempts?.[0];
      if (!row) return null;
      const [{ data: answers }, { data: questions }, { data: test }] = await Promise.all([
        supabase.from("test_answers").select("*").eq("attempt_id", row.id),
        supabase.from("test_questions").select("*").eq("test_id", id).order("position"),
        supabase.from("tests").select("name, category").eq("id", id).maybeSingle(),
      ]);
      return { attempt: row, answers: answers ?? [], questions: questions ?? [], test };
    },
  });

  if (isLoading) {
    return (
      <StudentShell>
        <PageHeader title="Test result" />
        <div className="mx-auto max-w-3xl px-4 py-5">
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      </StudentShell>
    );
  }

  if (!data) {
    return (
      <StudentShell>
        <PageHeader title="Test result" />
        <div className="mx-auto max-w-3xl px-4 py-10 text-center">
          <p className="text-sm font-semibold">No attempt found for this test.</p>
          <Button className="mt-4" onClick={() => navigate({ to: "/tests" })}>
            Back to Test Center
          </Button>
        </div>
      </StudentShell>
    );
  }

  const a = data.attempt;

  return (
    <StudentShell>
      <PageHeader title="Test Result" subtitle={data.test?.name ?? ""} />
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-4 lg:px-8">
        <section className="card-soft gradient-brand p-5 text-center text-primary-foreground">
          <p className="text-xs uppercase tracking-wide opacity-80">Score</p>
          <p className="text-4xl font-bold">
            {a.correct_count}
            <span className="text-xl opacity-70">/{a.total_questions}</span>
          </p>
          <p className="mt-1 text-sm font-semibold">{Math.round(Number(a.percentage))}%</p>
        </section>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="Correct" value={String(a.correct_count)} />
          <Stat label="Incorrect" value={String(a.incorrect_count)} />
          <Stat label="Unanswered" value={String(a.unanswered_count)} />
          <Stat label="Accuracy" value={`${Math.round(Number(a.accuracy))}%`} />
          <Stat label="Time taken" value={mmss(a.time_taken_sec)} />
          <Stat label="Percentage" value={`${Math.round(Number(a.percentage))}%`} />
        </section>

        <div className="flex items-center gap-2.5 px-1">
          <Switch id="show-answers" checked={showAnswers} onCheckedChange={setShowAnswers} />
          <Label htmlFor="show-answers" className="text-sm">
            Show correct answers
          </Label>
        </div>

        <section className="space-y-3">
          {data.questions.map((q, i) => {
            const ans = data.answers.find((x) => x.question_id === q.id);
            const selected = ans?.selected_option ?? null;
            const ok = selected === q.correct_option;
            return (
              <article key={q.id} className="card-soft p-4">
                <div className="flex items-start gap-2">
                  <span className="text-xs font-bold text-muted-foreground">Q{i + 1}</span>
                  <p className="flex-1 text-sm font-semibold">{q.question}</p>
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full",
                      !selected
                        ? "bg-muted text-muted-foreground"
                        : ok
                          ? "bg-success/15 text-success"
                          : "bg-destructive/12 text-destructive",
                    )}
                  >
                    {!selected ? "—" : ok ? <Check className="size-3.5" /> : <X className="size-3.5" />}
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Your answer: <span className="font-semibold">{selected ?? "Not answered"}</span>
                  {showAnswers && (
                    <>
                      {" · "}Correct answer: <span className="font-semibold">{q.correct_option}</span>
                    </>
                  )}
                </p>
                {showAnswers && q.explanation && (
                  <p className="mt-2 rounded-lg bg-secondary p-2.5 text-xs text-muted-foreground">
                    {q.explanation}
                  </p>
                )}
              </article>
            );
          })}
        </section>

        <div className="flex gap-2">
          <Button asChild variant="secondary" className="flex-1">
            <Link to="/tests">Test Center</Link>
          </Button>
          <Button asChild className="flex-1">
            <Link to="/tests/$id/attempt" params={{ id }}>
              Re-attempt
            </Link>
          </Button>
        </div>
      </div>
    </StudentShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-soft px-3 py-2.5">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-base font-bold">{value}</p>
    </div>
  );
}
