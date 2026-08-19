import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export function publicClient() {
  return createClient(process.env["SUPABASE_URL"]!, process.env["SUPABASE_PUBLISHABLE_KEY"]!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function adminDb() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function assertAdmin(userId: string) {
  const db = await adminDb();
  const { data } = await db
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Admin access required");
  return db;
}

export const studentSchema = z.object({
  student_id: z.string().trim().min(2).max(40),
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  phone: z
    .string()
    .trim()
    .max(30)
    .optional()
    .transform((v) => v ?? null),
  course: z.string().trim().max(40).default("BCA"),
  branch: z.string().trim().max(40).default("BCA"),
  cgpa: z.coerce.number().min(0).max(10),
  backlog_count: z.coerce.number().int().min(0).max(50).default(0),
  graduation_year: z.coerce.number().int().min(2000).max(2100).default(2026),
});

export type StudentRow = z.infer<typeof studentSchema>;

export function tempPassword() {
  return `Camp${Math.random().toString(36).slice(2, 8)}@${Math.floor(Math.random() * 90 + 10)}`;
}

export async function seedDemo() {
  const db = await adminDb();

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

  const { data: jobs } = await db.from("jobs").select("id, companies(name)").limit(10);
  const pick = (needle: string) =>
    (jobs ?? []).find((j) => ((j.companies as { name: string } | null)?.name ?? "").includes(needle));

  const samples = [
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
    if (!app) continue;
    const { count } = await db
      .from("application_status_history")
      .select("id", { count: "exact", head: true })
      .eq("application_id", app.id);
    if (count) continue;
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

  const { count: attemptCount } = await db
    .from("test_attempts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", studentId);
  if (!attemptCount) {
    const { data: tests } = await db.from("tests").select("id");
    const scores = [
      { pct: 62, acc: 70 },
      { pct: 88, acc: 90 },
      { pct: 72, acc: 78 },
    ];
    let i = 0;
    for (const t of tests ?? []) {
      const s = scores[i % scores.length]!;
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
}
