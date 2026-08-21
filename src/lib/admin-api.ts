import { supabase } from "@/integrations/supabase/client";

/**
 * Admin data helpers. Every call goes through the Data API, so Postgres RLS
 * (`is_admin()`) is the real authority — the UI guard is only a convenience.
 */

export const APPLICATION_STATUSES = [
  "Applied",
  "Under Review",
  "Shortlisted",
  "Selected",
  "Rejected",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const PLACEMENT_STATUSES = ["Not Placed", "In Process", "Placed"] as const;

export const TEST_CATEGORIES = [
  "Quantitative Aptitude",
  "Logical Reasoning",
  "Verbal Ability",
  "Technical",
  "Coding",
] as const;

export const DIFFICULTIES = ["Easy", "Medium", "Hard"] as const;

export const COURSES = ["BCA", "BSc", "BCom", "BBA", "MCA", "BTech"] as const;

/** Writes an audit trail row. Only admins are allowed to insert (RLS). */
export async function audit(
  action: string,
  entity: string,
  entityId?: string | null,
  details?: string | null,
) {
  const { data } = await supabase.auth.getUser();
  await supabase.from("audit_logs").insert({
    admin_user_id: data.user?.id ?? null,
    admin_name: (data.user?.user_metadata as { full_name?: string } | null)?.full_name ?? data.user?.email ?? null,
    action,
    entity,
    entity_id: entityId ?? null,
    details: details ?? null,
  });
}

/** Fan-out in-app notifications to a list of students. */
export async function notify(
  userIds: string[],
  n: { type: string; title: string; body?: string; link?: string },
) {
  if (!userIds.length) return 0;
  const rows = userIds.map((user_id) => ({
    user_id,
    type: n.type,
    title: n.title,
    body: n.body ?? "",
    link: n.link ?? null,
  }));
  await supabase.from("notifications").insert(rows);
  return rows.length;
}

export async function activeStudentIds(filter?: { branch?: string; course?: string }) {
  let q = supabase.from("student_profiles").select("user_id").eq("is_active", true);
  if (filter?.branch) q = q.eq("branch", filter.branch);
  if (filter?.course) q = q.eq("course", filter.course);
  const { data } = await q;
  return (data ?? []).map((s) => s.user_id);
}

/** Students matching a job's eligibility rules — used for targeted notifications. */
export async function eligibleStudentIds(job: {
  branches: string[];
  min_cgpa: number;
  max_backlogs: number;
  graduation_years: number[];
}) {
  const { data } = await supabase
    .from("student_profiles")
    .select("user_id, branch, course, cgpa, backlog_count, graduation_year")
    .eq("is_active", true);
  return (data ?? [])
    .filter((s) => {
      const branchOk =
        !job.branches.length ||
        job.branches.some(
          (b) => b.toLowerCase() === s.branch.toLowerCase() || b.toLowerCase() === s.course.toLowerCase(),
        );
      const yearOk = !job.graduation_years.length || job.graduation_years.includes(s.graduation_year);
      return (
        branchOk &&
        yearOk &&
        Number(s.cgpa) >= Number(job.min_cgpa) &&
        s.backlog_count <= job.max_backlogs
      );
    })
    .map((s) => s.user_id);
}

/** Updates an application status, records history and notifies the student. */
export async function setApplicationStatus(
  app: { id: string; user_id: string; status: string; label?: string },
  status: ApplicationStatus,
) {
  if (app.status === status) return;
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase.from("applications").update({ status }).eq("id", app.id);
  if (error) throw error;
  await supabase.from("application_status_history").insert({
    application_id: app.id,
    status,
    changed_by: userData.user?.id ?? null,
  });
  await notify([app.user_id], {
    type: "status",
    title: "Application Status Update",
    body: `${app.label ? `${app.label}: ` : ""}your application is now "${status}".`,
    link: "/applications",
  });
  if (status === "Selected") {
    await supabase
      .from("student_profiles")
      .update({ placement_status: "Placed" })
      .eq("user_id", app.user_id);
  } else if (status === "Shortlisted" || status === "Under Review") {
    await supabase
      .from("student_profiles")
      .update({ placement_status: "In Process" })
      .eq("user_id", app.user_id)
      .neq("placement_status", "Placed");
  }
  await audit("application.status_changed", "applications", app.id, status);
}

export function csvList(value: string) {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export function numberList(value: string) {
  return csvList(value)
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n));
}
