import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  adminDb,
  assertAdmin,
  publicClient,
  seedDemo,
  studentSchema,
  tempPassword,
} from "./auth.server";

/** Students sign in with their College / Student ID — the email stays server-side. */
export const studentLogin = createServerFn({ method: "POST" })
  .inputValidator((d: { studentId: string; password: string }) =>
    z
      .object({ studentId: z.string().trim().min(2).max(40), password: z.string().min(6).max(128) })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const db = await adminDb();
    const { data: profile } = await db
      .from("student_profiles")
      .select("user_id, email, is_active, must_change_password, full_name")
      .ilike("student_id", data.studentId.trim())
      .maybeSingle();

    if (!profile) return { ok: false as const, error: "Invalid Student ID or password" };
    if (!profile.is_active)
      return {
        ok: false as const,
        error: "This account is deactivated. Contact the placement cell.",
      };

    const { data: signIn, error } = await publicClient().auth.signInWithPassword({
      email: profile.email,
      password: data.password,
    });
    if (error || !signIn.session)
      return { ok: false as const, error: "Invalid Student ID or password" };

    return {
      ok: true as const,
      access_token: signIn.session.access_token,
      refresh_token: signIn.session.refresh_token,
      mustChangePassword: profile.must_change_password,
      name: profile.full_name,
    };
  });

/** Sends a password reset email to the address on file for a Student ID. */
export const studentForgotPassword = createServerFn({ method: "POST" })
  .inputValidator((d: { studentId: string; redirectTo: string }) =>
    z
      .object({ studentId: z.string().trim().min(2).max(40), redirectTo: z.string().url() })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const db = await adminDb();
    const { data: profile } = await db
      .from("student_profiles")
      .select("email")
      .ilike("student_id", data.studentId.trim())
      .maybeSingle();
    if (profile) {
      await publicClient().auth.resetPasswordForEmail(profile.email, {
        redirectTo: data.redirectTo,
      });
    }
    return { ok: true as const };
  });

/** Admin-only: provision a student account (no public self-registration). */
export const adminCreateStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => studentSchema.parse(d))
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context.userId);
    const password = tempPassword();
    const { data: created, error } = await db.auth.admin.createUser({
      email: data.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name, student_id: data.student_id },
    });
    if (error || !created.user)
      return { ok: false as const, error: error?.message ?? "Could not create user" };

    const userId = created.user.id;
    await db.from("user_roles").insert({ user_id: userId, role: "student" });
    const { error: pErr } = await db.from("student_profiles").insert({
      user_id: userId,
      student_id: data.student_id,
      full_name: data.full_name,
      email: data.email,
      phone: data.phone,
      course: data.course,
      branch: data.branch,
      cgpa: data.cgpa,
      backlog_count: data.backlog_count,
      graduation_year: data.graduation_year,
      must_change_password: true,
      summary: "",
      skills: [],
    });
    if (pErr) {
      await db.auth.admin.deleteUser(userId);
      return { ok: false as const, error: pErr.message };
    }
    await db.from("notifications").insert({
      user_id: userId,
      type: "general",
      title: "Welcome to the Placement Portal",
      body: "Your account has been created. Please change your temporary password and complete your resume.",
    });
    await db.from("audit_logs").insert({
      admin_user_id: context.userId,
      action: "student.created",
      entity: "student_profiles",
      entity_id: data.student_id,
      details: data.full_name,
    });
    return { ok: true as const, password };
  });

/** Admin-only: reset a student's password to a new temporary password. */
export const adminResetStudentPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string }) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context.userId);
    const password = tempPassword();
    const { error } = await db.auth.admin.updateUserById(data.userId, { password });
    if (error) return { ok: false as const, error: error.message };
    await db
      .from("student_profiles")
      .update({ must_change_password: true })
      .eq("user_id", data.userId);
    await db.from("audit_logs").insert({
      admin_user_id: context.userId,
      action: "student.password_reset",
      entity: "student_profiles",
      entity_id: data.userId,
    });
    return { ok: true as const, password };
  });

/** Admin-only: bulk import students from parsed CSV rows. */
export const adminBulkImportStudents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { rows: unknown[] }) =>
    z.object({ rows: z.array(z.record(z.any())).max(500) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context.userId);
    const results: {
      row: number;
      student_id: string;
      status: string;
      message: string;
      password?: string;
    }[] = [];

    for (let i = 0; i < data.rows.length; i++) {
      const raw = (data.rows[i] ?? {}) as Record<string, string>;
      const parsed = studentSchema.safeParse(raw);
      if (!parsed.success) {
        results.push({
          row: i + 1,
          student_id: String(raw["student_id"] ?? "-"),
          status: "error",
          message: parsed.error.issues.map((x) => `${x.path.join(".")}: ${x.message}`).join("; "),
        });
        continue;
      }
      const row = parsed.data;
      const { data: dup } = await db
        .from("student_profiles")
        .select("student_id")
        .or(`student_id.eq.${row.student_id},email.eq.${row.email}`)
        .maybeSingle();
      if (dup) {
        results.push({
          row: i + 1,
          student_id: row.student_id,
          status: "duplicate",
          message: "Student ID or email already exists",
        });
        continue;
      }
      const password = tempPassword();
      const { data: created, error } = await db.auth.admin.createUser({
        email: row.email,
        password,
        email_confirm: true,
        user_metadata: { full_name: row.full_name, student_id: row.student_id },
      });
      if (error || !created.user) {
        results.push({
          row: i + 1,
          student_id: row.student_id,
          status: "error",
          message: error?.message ?? "Auth error",
        });
        continue;
      }
      await db.from("user_roles").insert({ user_id: created.user.id, role: "student" });
      const { error: pErr } = await db.from("student_profiles").insert({
        user_id: created.user.id,
        student_id: row.student_id,
        full_name: row.full_name,
        email: row.email,
        phone: row.phone,
        course: row.course,
        branch: row.branch,
        cgpa: row.cgpa,
        backlog_count: row.backlog_count,
        graduation_year: row.graduation_year,
        must_change_password: true,
        skills: [],
      });
      if (pErr) {
        await db.auth.admin.deleteUser(created.user.id);
        results.push({
          row: i + 1,
          student_id: row.student_id,
          status: "error",
          message: pErr.message,
        });
        continue;
      }
      await db.from("notifications").insert({
        user_id: created.user.id,
        type: "general",
        title: "Welcome to the Placement Portal",
        body: "Your placement account is ready. Change your temporary password on first login.",
      });
      results.push({
        row: i + 1,
        student_id: row.student_id,
        status: "imported",
        message: "Account created",
        password,
      });
    }

    await db.from("audit_logs").insert({
      admin_user_id: context.userId,
      action: "student.bulk_import",
      entity: "student_profiles",
      details: `${results.filter((r) => r.status === "imported").length} imported of ${data.rows.length}`,
    });
    return { results };
  });

/** Admin-only: send notifications to a target audience. */
export const adminSendNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        title: z.string().trim().min(2).max(120),
        body: z.string().trim().max(500).default(""),
        type: z.string().max(40).default("general"),
        audience: z.enum(["all", "branch", "job_applicants"]),
        branch: z.string().max(40).optional(),
        jobId: z.string().uuid().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context.userId);
    let userIds: string[] = [];

    if (data.audience === "job_applicants" && data.jobId) {
      const { data: apps } = await db
        .from("applications")
        .select("user_id")
        .eq("job_id", data.jobId);
      userIds = (apps ?? []).map((a) => a.user_id);
    } else {
      let q = db.from("student_profiles").select("user_id").eq("is_active", true);
      if (data.audience === "branch" && data.branch) q = q.eq("branch", data.branch);
      const { data: students } = await q;
      userIds = (students ?? []).map((s) => s.user_id);
    }

    if (userIds.length) {
      await db
        .from("notifications")
        .insert(
          userIds.map((id) => ({
            user_id: id,
            type: data.type,
            title: data.title,
            body: data.body,
          })),
        );
    }
    await db.from("audit_logs").insert({
      admin_user_id: context.userId,
      action: "notification.sent",
      entity: "notifications",
      details: `${data.title} → ${userIds.length} students`,
    });
    return { ok: true as const, count: userIds.length };
  });

/** One-time demo bootstrap: creates the demo admin + demo student with sample activity. */
export const seedDemoAccounts = createServerFn({ method: "POST" }).handler(async () => seedDemo());
