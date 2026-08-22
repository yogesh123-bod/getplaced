import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  gradeAndStoreAttempt,
  loadAttemptReview,
  loadTestForAttempt,
  publishedQuestionCounts,
} from "./tests.server";

/** Questions without the answer key — safe to send to the student's browser. */
export const getTestQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { testId: string }) => z.object({ testId: z.string().uuid() }).parse(d))
  .handler(({ data, context }) => loadTestForAttempt(data.testId, context.userId));

/** Question counts per published test, for the test listing cards. */
export const getQuestionCounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(() => publishedQuestionCounts());

/** Grades on the server so the correct answers never reach the client. */
export const submitTestAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      testId: string;
      timeTakenSec: number;
      answers: { questionId: string; selected: string | null; marked: boolean }[];
    }) =>
      z
        .object({
          testId: z.string().uuid(),
          timeTakenSec: z.coerce.number().int().min(0).max(86400),
          answers: z
            .array(
              z.object({
                questionId: z.string().uuid(),
                selected: z.enum(["A", "B", "C", "D"]).nullable(),
                marked: z.boolean(),
              }),
            )
            .max(500),
        })
        .parse(d),
  )
  .handler(({ data, context }) =>
    gradeAndStoreAttempt(context.userId, data.testId, data.answers, data.timeTakenSec),
  );

/** Answer key is only returned for a submitted attempt the caller owns. */
export const getAttemptReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { testId: string; attemptId?: string | null }) =>
    z
      .object({ testId: z.string().uuid(), attemptId: z.string().uuid().nullish() })
      .parse(d),
  )
  .handler(({ data, context }) =>
    loadAttemptReview(context.userId, data.testId, data.attemptId ?? null),
  );
