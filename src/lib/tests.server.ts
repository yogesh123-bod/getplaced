/**
 * Server-only practice-test logic. Answer keys (`correct_option`, `explanation`)
 * live behind these helpers: students cannot read `test_questions` directly.
 */

export async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function isAdmin(userId: string) {
  const client = await db();
  const { data } = await client
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}

/** Test row + questions with the answer columns stripped. */
export async function loadTestForAttempt(testId: string, userId: string) {
  const client = await db();
  const { data: test, error } = await client.from("tests").select("*").eq("id", testId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!test) throw new Error("Test not found");
  if (!test.published && !(await isAdmin(userId))) throw new Error("Test not available");

  const { data: questions, error: qError } = await client
    .from("test_questions")
    .select("id, position, question, option_a, option_b, option_c, option_d")
    .eq("test_id", testId)
    .order("position");
  if (qError) throw new Error(qError.message);

  return { test, questions: questions ?? [] };
}

export async function publishedQuestionCounts() {
  const client = await db();
  const { data, error } = await client
    .from("test_questions")
    .select("test_id, tests!inner(published)")
    .eq("tests.published", true);
  if (error) throw new Error(error.message);
  const counts: Record<string, number> = {};
  for (const row of data ?? []) counts[row.test_id] = (counts[row.test_id] ?? 0) + 1;
  return counts;
}

export type SubmittedAnswer = { questionId: string; selected: string | null; marked: boolean };

/** Grades the attempt server-side and persists attempt + per-question answers. */
export async function gradeAndStoreAttempt(
  userId: string,
  testId: string,
  submitted: SubmittedAnswer[],
  timeTakenSec: number,
) {
  const client = await db();
  const { data: test } = await client
    .from("tests")
    .select("id, published")
    .eq("id", testId)
    .maybeSingle();
  if (!test) throw new Error("Test not found");
  if (!test.published && !(await isAdmin(userId))) throw new Error("Test not available");

  const { data: questions, error } = await client
    .from("test_questions")
    .select("id, correct_option")
    .eq("test_id", testId);
  if (error) throw new Error(error.message);
  if (!questions?.length) throw new Error("This test has no questions yet");

  const byId = new Map(submitted.map((s) => [s.questionId, s]));
  let correct = 0;
  let incorrect = 0;
  let unanswered = 0;
  const rows = questions.map((q) => {
    const selected = byId.get(q.id)?.selected ?? null;
    const ok = selected !== null && selected === q.correct_option;
    if (selected === null) unanswered++;
    else if (ok) correct++;
    else incorrect++;
    return {
      question_id: q.id,
      selected_option: selected,
      is_correct: ok,
      marked_for_review: byId.get(q.id)?.marked ?? false,
    };
  });

  const total = questions.length;
  const attempted = correct + incorrect;
  const { data: attempt, error: attemptError } = await client
    .from("test_attempts")
    .insert({
      test_id: testId,
      user_id: userId,
      total_questions: total,
      correct_count: correct,
      incorrect_count: incorrect,
      unanswered_count: unanswered,
      percentage: total ? (correct / total) * 100 : 0,
      accuracy: attempted ? (correct / attempted) * 100 : 0,
      time_taken_sec: Math.max(0, Math.round(timeTakenSec)),
      submitted_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (attemptError) throw new Error(attemptError.message);

  const { error: answersError } = await client
    .from("test_answers")
    .insert(rows.map((r) => ({ ...r, attempt_id: attempt.id })));
  if (answersError) throw new Error(answersError.message);

  return attempt.id;
}

/** Review payload for a *submitted* attempt the caller owns (or any, for admins). */
export async function loadAttemptReview(
  userId: string,
  testId: string,
  attemptId?: string | null,
) {
  const client = await db();
  const admin = await isAdmin(userId);

  let query = client.from("test_attempts").select("*").eq("test_id", testId);
  if (attemptId) query = query.eq("id", attemptId);
  else query = query.not("submitted_at", "is", null).order("submitted_at", { ascending: false });
  if (!admin) query = query.eq("user_id", userId);

  const { data: attempts, error } = await query.limit(1);
  if (error) throw new Error(error.message);
  const attempt = attempts?.[0];
  if (!attempt) return null;
  if (!admin && attempt.user_id !== userId) return null;
  if (!attempt.submitted_at) return null;

  const [{ data: answers }, { data: questions }, { data: test }] = await Promise.all([
    client.from("test_answers").select("*").eq("attempt_id", attempt.id),
    client.from("test_questions").select("*").eq("test_id", testId).order("position"),
    client.from("tests").select("name, category").eq("id", testId).maybeSingle(),
  ]);

  return { attempt, answers: answers ?? [], questions: questions ?? [], test };
}
