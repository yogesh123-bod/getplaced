import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { Flag, Timer } from "lucide-react";
import { toast } from "sonner";
import { getTestQuestions, submitTestAttempt } from "@/lib/tests.functions";
import { useSession } from "@/lib/session";
import { mmss } from "@/lib/format";
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

export const Route = createFileRoute("/_authenticated/tests/$id/attempt")({
  head: () => ({
    meta: [
      { title: "Active Test — Campus Placement Portal" },
      { name: "description", content: "Timed practice test with question navigator and auto submission." },
      { property: "og:title", content: "Active Test — Campus Placement Portal" },
      { property: "og:description", content: "Timed practice test with auto submission." },
    ],
  }),
  component: AttemptPage,
});

type Answers = Record<string, { selected: string | null; marked: boolean }>;

function AttemptPage() {
  const { id } = Route.useParams();
  const { session } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [remaining, setRemaining] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const startedAt = useRef(Date.now());
  const submitted = useRef(false);

  const { data, isLoading } = useQuery({
    queryKey: ["test-attempt-data", id],
    queryFn: async () => {
      const [{ data: test, error: testError }, { data: questions, error: qError }] = await Promise.all([
        supabase.from("tests").select("*").eq("id", id).maybeSingle(),
        supabase.from("test_questions").select("*").eq("test_id", id).order("position"),
      ]);
      if (testError) throw testError;
      if (qError) throw qError;
      return { test, questions: questions ?? [] };
    },
  });

  useEffect(() => {
    if (data?.test && remaining === null) setRemaining(data.test.duration_min * 60);
  }, [data?.test, remaining]);

  const submit = useMutation({
    mutationFn: async () => {
      const questions = data?.questions ?? [];
      if (!session.userId || !questions.length) throw new Error("Test not ready");
      let correct = 0;
      let incorrect = 0;
      let unanswered = 0;
      questions.forEach((q) => {
        const selected = answers[q.id]?.selected ?? null;
        if (!selected) unanswered++;
        else if (selected === q.correct_option) correct++;
        else incorrect++;
      });
      const total = questions.length;
      const attempted = correct + incorrect;
      const timeTaken = Math.round((Date.now() - startedAt.current) / 1000);
      const { data: attempt, error } = await supabase
        .from("test_attempts")
        .insert({
          test_id: id,
          user_id: session.userId,
          total_questions: total,
          correct_count: correct,
          incorrect_count: incorrect,
          unanswered_count: unanswered,
          percentage: total ? (correct / total) * 100 : 0,
          accuracy: attempted ? (correct / attempted) * 100 : 0,
          time_taken_sec: timeTaken,
          submitted_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (error) throw error;
      const rows = questions.map((q) => ({
        attempt_id: attempt.id,
        question_id: q.id,
        selected_option: answers[q.id]?.selected ?? null,
        is_correct: (answers[q.id]?.selected ?? null) === q.correct_option,
        marked_for_review: answers[q.id]?.marked ?? false,
      }));
      const { error: answerError } = await supabase.from("test_answers").insert(rows);
      if (answerError) throw answerError;
      return attempt.id;
    },
    onSuccess: (attemptId) => {
      toast.success("Test submitted successfully.");
      queryClient.invalidateQueries({ queryKey: ["test-attempts"] });
      navigate({ to: "/tests/$id/result", params: { id }, search: { attempt: attemptId } });
    },
    onError: (e: Error) => {
      submitted.current = false;
      toast.error(e.message);
    },
  });

  useEffect(() => {
    if (remaining === null) return;
    if (remaining <= 0) {
      if (!submitted.current) {
        submitted.current = true;
        toast.info("Time is up — submitting your test.");
        submit.mutate();
      }
      return;
    }
    const timer = window.setTimeout(() => setRemaining((r) => (r === null ? r : r - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [remaining, submit]);

  const questions = data?.questions ?? [];
  const unansweredCount = useMemo(
    () => questions.filter((q) => !answers[q.id]?.selected).length,
    [questions, answers],
  );

  if (isLoading || !data?.test) {
    return (
      <div className="mx-auto max-w-3xl space-y-3 p-4">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <div>
          <p className="text-sm font-semibold">This test has no questions yet.</p>
          <Button className="mt-4" onClick={() => navigate({ to: "/tests" })}>
            Back to Test Center
          </Button>
        </div>
      </div>
    );
  }

  const q = questions[index]!;
  const current = answers[q.id];
  const options = [
    ["A", q.option_a],
    ["B", q.option_b],
    ["C", q.option_c],
    ["D", q.option_d],
  ] as const;

  const setAnswer = (patch: Partial<{ selected: string | null; marked: boolean }>) =>
    setAnswers((prev) => ({
      ...prev,
      [q.id]: { selected: prev[q.id]?.selected ?? null, marked: prev[q.id]?.marked ?? false, ...patch },
    }));

  return (
    <div className="min-h-screen bg-secondary/40 pb-28">
      <header className="sticky top-0 z-30 border-b border-border bg-card px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-bold">{data.test.name}</h1>
            <p className="text-xs text-muted-foreground">
              Question {index + 1} of {questions.length}
            </p>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold tabular-nums",
              (remaining ?? 0) < 60 ? "bg-destructive/12 text-destructive" : "bg-primary/10 text-primary",
            )}
          >
            <Timer className="size-4" /> {mmss(remaining ?? 0)}
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-4 px-4 py-4">
        <div className="card-soft p-3">
          <div className="flex flex-wrap gap-1.5">
            {questions.map((item, i) => {
              const a = answers[item.id];
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Go to question ${i + 1}`}
                  className={cn(
                    "size-8 rounded-lg text-xs font-bold transition-colors",
                    i === index
                      ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                      : a?.marked
                        ? "bg-warning/25 text-warning-foreground"
                        : a?.selected
                          ? "bg-success/20 text-success"
                          : "bg-secondary text-muted-foreground",
                  )}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
            <Legend className="bg-success/20" label="Answered" />
            <Legend className="bg-warning/25" label="Marked" />
            <Legend className="bg-secondary" label="Unanswered" />
          </div>
        </div>

        <div className="card-soft p-4">
          <p className="text-sm font-semibold leading-relaxed">{q.question}</p>
          <div className="mt-4 space-y-2">
            {options.map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setAnswer({ selected: key })}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm transition-colors",
                  current?.selected === key
                    ? "border-primary bg-primary/[0.06] font-semibold text-primary"
                    : "border-border bg-card hover:bg-accent/40",
                )}
              >
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
                    current?.selected === key
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border",
                  )}
                >
                  {key}
                </span>
                {label}
              </button>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={index === 0}
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
            >
              Previous
            </Button>
            <Button
              variant={current?.marked ? "default" : "outline"}
              size="sm"
              onClick={() => setAnswer({ marked: !current?.marked })}
            >
              <Flag className="size-4" /> {current?.marked ? "Unmark" : "Mark for Review"}
            </Button>
            <Button
              size="sm"
              className="ml-auto"
              disabled={index === questions.length - 1}
              onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-card px-4 py-3">
        <div className="mx-auto max-w-3xl">
          <Button className="w-full" onClick={() => setConfirmOpen(true)} disabled={submit.isPending}>
            {submit.isPending ? "Submitting..." : "Submit Test"}
          </Button>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit test?</DialogTitle>
            <DialogDescription>
              {unansweredCount > 0
                ? `You have ${unansweredCount} unanswered question${unansweredCount > 1 ? "s" : ""}. Are you sure you want to submit?`
                : "All questions are answered. Submit your test now?"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              Keep working
            </Button>
            <Button
              onClick={() => {
                submitted.current = true;
                submit.mutate();
              }}
              disabled={submit.isPending}
            >
              Submit Test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("size-3 rounded", className)} /> {label}
    </span>
  );
}
