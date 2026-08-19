import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function publicClient() {
  return createClient(process.env["SUPABASE_URL"]!, process.env["SUPABASE_PUBLISHABLE_KEY"]!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function assertAdmin(userId: string) {
  const db = await admin();
  const { data } = await db
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Admin access required");
  return db;
}

/** Students sign in with their College / Student ID — the email stays server-side. */
export const studentLogin = createServerFn({ method: "POST" })
  .inputValidator((d: { studentId: string; password: string }) =>
    z.object({ studentId: z.string().trim().min(2).max(40), password: z.string().min(6).max(128) }).parse(d),
  )
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: profile } = await db
      .from("student_profiles")
      .select("user_id, email, is_active, must_change_password, full_name")
      .ilike("student_id", data.studentId.trim())
      .maybeSingle();

    if (!profile) return { ok: false as const, error: "Invalid Student ID or password" };
    if (!profile.is_active)
      return { ok: false as const, error: "This account is deactivated. Contact the placement cell." };

    const { data: signIn, error } = await publicClient().auth.signInWithPassword({
      email: profile.email,
      password: data.password,
    });
    if (error || !signIn.session) return { ok: false as const, error: "Invalid Student ID or password" };

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
    z.object({ studentId: z.string().trim().min(2).max(40), redirectTo: z.string().url() }).parse(d),
  )
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: profile } = await db
      .from("student_profiles")
      .select("email")
      .ilike("student_id", data.studentId.trim())
      .maybeSingle();
    if (profile) {
      await publicClient().auth.resetPasswordForEmail(profile.email, { redirectTo: data.redirectTo });
    }
    return { ok: true as const };
  });

const studentSchema = z.object({
  student_id: z.string().trim().min(2).max(40),
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(30).optional().nullable(),
  course: z.string().trim().max(40).default("BCA"),
  branch: z.string().trim().max(40).default("BCA"),
  cgpa: z.coerce.number().min(0).max(10),
  backlog_count: z.coerce.number().int().min(0).max(50).default(0),
  graduation_year: z.coerce.number().int().min(2000).max(2100).default(2026),
});

function tempPassword() {
  return `Camp${Math.random().toString(36).slice(2, 8)}@${Math.floor(Math.random() * 90 + 10)}`;
}

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
    if (error || !created.user) return { ok: false as const, error: error?.message ?? "Could not create user" };

    const userId = created.user.id;
    await db.from("user_roles").insert({ user_id: userId, role: "student" });
    const { error: pErr } = await db.from("student_profiles").insert({
      user_id: userId,
      ...data,
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
      body: `Your account has been created. Please change your temporary password and complete your resume.`,
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
    await db.from("student_profiles").update({ must_change_password: true }).eq("user_id", data.userId);
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
  .inputValidator((d: { rows: unknown[] }) => z.object({ rows: z.array(z.record(z.any())).max(500) }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await assertAdmin(context.userId);
    const results: { row: number; student_id: string; status: string; message: string; password?: string }[] = [];

    for (let i = 0; i < data.rows.length; i++) {
      const raw = data.rows[i] as Record<string, string>;
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
        results.push({ row: i + 1, student_id: row.student_id, status: "duplicate", message: "Student ID or email already exists" });
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
        results.push({ row: i + 1, student_id: row.student_id, status: "error", message: error?.message ?? "Auth error" });
        continue;
      }
      await db.from("user_roles").insert({ user_id: created.user.id, role: "student" });
      const { error: pErr } = await db
        .from("student_profiles")
        .insert({ user_id: created.user.id, ...row, must_change_password: true, skills: [] });
      if (pErr) {
        await db.auth.admin.deleteUser(created.user.id);
        results.push({ row: i + 1, student_id: row.student_id, status: "error", message: pErr.message });
        continue;
      }
      await db.from("notifications").insert({
        user_id: created.user.id,
        type: "general",
        title: "Welcome to the Placement Portal",
        body: "Your placement account is ready. Change your temporary password on first login.",
      });
      results.push({ row: i + 1, student_id: row.student_id, status: "imported", message: "Account created", password });
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
      const { data: apps } = await db.from("applications").select("user_id").eq("job_id", data.jobId);
      userIds = (apps ?? []).map((a) => a.user_id);
    } else {
      let q = db.from("student_profiles").select("user_id").eq("is_active", true);
      if (data.audience === "branch" && data.branch) q = q.eq("branch", data.branch);
      const { data: students } = await q;
      userIds = (students ?? []).map((s) => s.user_id);
    }

    if (userIds.length) {
      await db.from("notifications").insert(
        userIds.map((id) => ({ user_id: id, type: data.type, title: data.title, body: data.body })),
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
export const seedDemoAccounts = createServerFn({ method: "POST" }).handler(async () => {
  const db = await admin();

  const ensureUser = async (email: string, password: string, meta: Record<string, unknown>) => {
    const { data: created, error } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: meta,
    });
    if (created?.user) return created.user.id;
    if (error && !/already/i.test(error.message)) throw new Error(error.message);
    const { data: list } = await db.auth.admin.listUsers({ page: 1, perPage: 200 });
    const found = list?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (!found) throw new Error("Could not resolve demo user");
    await db.auth.admin.updateUserById(found.id, { password });
    return found.id;
  };

  const adminId = await ensureUser("admin@college.edu.in", "Admin@12345", { full_name: "Placement Cell" });
  await db.from("user_roles").upsert({ user_id: adminId, role: "admin" }, { onConflict: "user_id,role" });

  const studentId = await ensureUser("rahul.sharma@college.edu.in", "Student@12345", {
    full_name: "Rahul Sharma",
    student_id: "22BCA1047",
  });
  await db.from("user_roles").upsert({ user_id: studentId, role: "student" }, { onConflict: "user_id,role" });

  await db.from("student_profiles").upsert(
    {
      user_id: studentId,
      student_id: "22BCA1047",
      full_name: "Rahul Sharma",
      email: "rahul.sharma@college.edu.in",
      phone: "+91 98765 43210",
      course: "BCA",
      branch: "BCA",
      college: "ABC College, Pune",
      cgpa: 7.56,
      backlog_count: 0,
      graduation_year: 2026,
      placement_status: "Not Placed",
      summary:
        "Motivated BCA student with strong analytical skills and a passion for problem solving. Comfortable building web applications and working with databases.",
      skills: ["Java", "Python", "SQL", "C++", "Problem Solving", "Communication"],
      must_change_password: false,
      is_active: true,
    },
    { onConflict: "user_id" },
  );

  // Sample applications
  const { data: jobs } = await db.from("jobs").select("id, title, company_id, companies(name)").limit(10);
  const pick = (needle: string) => jobs?.find((j) => (j.companies as { name: string } | null)?.name.includes(needle));
  const samples: { job?: { id: string }; status: string; days: number }[] = [
    { job: pick("Tata"), status: "Shortlisted", days: 9 },
    { job: pick("Infosys"), status: "Under Review", days: 14 },
    { job: pick("Wipro"), status: "Applied", days: 3 },
  ];
  for (const s of samples) {
    if (!s.job) continue;
    const appliedAt = new Date(Date.now() - s.days * 86400000).toISOString();
    const { data: app } = await db
      .from("applications")
      .upsert(
        { job_id: s.job.id, user_id: studentId, status: s.status, applied_at: appliedAt },
        { onConflict: "job_id,user_id" },
      )
      .select("id")
      .maybeSingle();
    if (app) {
      const { count } = await db
        .from("application_status_history")
        .select("id", { count: "exact", head: true })
        .eq("application_id", app.id);
      if (!count) {
        const chain = ["Applied", "Under Review", "Shortlisted", "Selected", "Rejected"];
        const upto = chain.indexOf(s.status);
        await db.from("application_status_history").insert(
          chain.slice(0, upto + 1).map((st, i) => ({
            application_id: app.id,
            status: st,
            created_at: new Date(Date.now() - (s.days - i) * 86400000).toISOString(),
          })),
        );
      }
    }
  }

  // Sample test attempts
  const { count: attemptCount } = await db
    .from("test_attempts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", studentId);
  if (!attemptCount) {
    const { data: tests } = await db.from("tests").select("id, name");
    const scores = [
      { pct: 62, acc: 70 },
      { pct: 88, acc: 90 },
      { pct: 72, acc: 78 },
    ];
    let i = 0;
    for (const t of tests ?? []) {
      const s = scores[i % scores.length];
      const total = 8;
      const correct = Math.round((s.pct / 100) * total);
      await db.from("test_attempts").insert({
        test_id: t.id,
        user_id: studentId,
        started_at: new Date(Date.now() - (i + 2) * 86400000).toISOString(),
        submitted_at: new Date(Date.now() - (i + 2) * 86400000 + 1500000).toISOString(),
        total_questions: total,
        correct_count: correct,
        incorrect_count: total - correct,
        unanswered_count: 0,
        percentage: s.pct,
        accuracy: s.acc,
        time_taken_sec: 1450 + i * 120,
      });
      i++;
    }
  }

  // Sample notifications
  const { count: notifCount } = await db
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", studentId);
  if (!notifCount) {
    await db.from("notifications").insert([
      { user_id: studentId, type: "job", title: "New Placement Opportunity", body: "TCS has posted a new placement opportunity.", link: "/jobs" },
      { user_id: studentId, type: "status", title: "Application Status Update", body: "Congratulations! You have been shortlisted by TCS.", link: "/applications" },
      { user_id: studentId, type: "announcement", title: "New Announcement", body: "Aptitude Test is scheduled for Friday.", link: "/home" },
      { user_id: studentId, type: "test", title: "New Practice Test Available", body: "New Quantitative Aptitude test is available for BCA students.", link: "/tests" },
      { user_id: studentId, type: "deadline", title: "Deadline Reminder", body: "Last date to apply for the Infosys drive is 22 Aug 2026.", link: "/jobs", is_read: true },
    ]);
  }

  return {
    ok: true as const,
    admin: { email: "admin@college.edu.in", password: "Admin@12345" },
    student: { studentId: "22BCA1047", password: "Student@12345" },
  };
});
