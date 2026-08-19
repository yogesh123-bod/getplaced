export type EligibilityInput = {
  branches: string[];
  min_cgpa: number;
  max_backlogs: number;
  graduation_years: number[];
  skills: string[];
};

export type StudentInput = {
  branch: string;
  course: string;
  cgpa: number;
  backlog_count: number;
  graduation_year: number;
  skills: string[];
  gender?: string | null;
};

export type EligibilityResult = {
  eligible: boolean;
  reasons: string[];
  checks: { label: string; ok: boolean; detail: string }[];
};

/** Automatic eligibility engine: compares a student profile against job criteria. */
export function evaluateEligibility(
  job: EligibilityInput,
  student: StudentInput | null | undefined,
): EligibilityResult {
  if (!student) {
    return { eligible: false, reasons: ["Student profile unavailable"], checks: [] };
  }

  const reasons: string[] = [];
  const checks: EligibilityResult["checks"] = [];

  const branchList = job.branches ?? [];
  const branchOk =
    branchList.length === 0 ||
    branchList.some(
      (b) =>
        b.toLowerCase() === student.branch.toLowerCase() ||
        b.toLowerCase() === student.course.toLowerCase(),
    );
  checks.push({
    label: "Branch",
    ok: branchOk,
    detail: branchList.length ? branchList.join(", ") : "All branches",
  });
  if (!branchOk) reasons.push(`Branch ${student.branch} is not eligible for this drive`);

  const cgpaOk = Number(student.cgpa) >= Number(job.min_cgpa);
  checks.push({ label: "CGPA", ok: cgpaOk, detail: `≥ ${Number(job.min_cgpa).toFixed(1)}` });
  if (!cgpaOk)
    reasons.push(
      `CGPA ${Number(student.cgpa).toFixed(2)} — Minimum ${Number(job.min_cgpa).toFixed(1)} required`,
    );

  const backlogOk = student.backlog_count <= job.max_backlogs;
  checks.push({
    label: "Backlogs",
    ok: backlogOk,
    detail: job.max_backlogs === 0 ? "No active backlogs" : `Max ${job.max_backlogs} active`,
  });
  if (!backlogOk)
    reasons.push(
      job.max_backlogs === 0
        ? `${student.backlog_count} active backlog(s) — no active backlogs allowed`
        : `${student.backlog_count} active backlogs — maximum ${job.max_backlogs} allowed`,
    );

  const years = job.graduation_years ?? [];
  const yearOk = years.length === 0 || years.includes(student.graduation_year);
  checks.push({
    label: "Graduation year",
    ok: yearOk,
    detail: years.length ? years.join(" / ") : "Any year",
  });
  if (!yearOk) reasons.push(`Graduation year ${student.graduation_year} is not eligible`);

  return { eligible: reasons.length === 0, reasons, checks };
}

export const APPLICATION_STATUSES = [
  "Applied",
  "Under Review",
  "Shortlisted",
  "Selected",
  "Rejected",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export function statusStage(status: string): number {
  switch (status) {
    case "Applied":
      return 0;
    case "Under Review":
      return 1;
    case "Shortlisted":
      return 2;
    case "Selected":
      return 3;
    case "Rejected":
      return 3;
    default:
      return 0;
  }
}
