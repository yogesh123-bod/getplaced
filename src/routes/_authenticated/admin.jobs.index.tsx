import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Eye, Pencil, Plus, Trash2, Users } from "lucide-react";
import { AdminShell } from "@/components/placement/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { StatusBadge } from "@/components/placement/StatusBadge";
import { downloadCsv, lpa, shortDate } from "@/lib/format";
import { audit, COURSES, csvList, eligibleStudentIds, notify, numberList } from "@/lib/admin-api";

export const Route = createFileRoute("/_authenticated/admin/jobs/")({
  validateSearch: (s: Record<string, unknown>) => ({ new: s['new'] === "1" ? "1" : undefined }),
  head: () => ({
    meta: [
      { title: "Jobs — Placement Cell" },
      { name: "description", content: "Manage placement drives, eligibility criteria and deadlines." },
      { property: "og:title", content: "Jobs — Placement Cell" },
      { property: "og:description", content: "Manage placement drives, eligibility criteria and deadlines." },
    ],
  }),
  component: Page,
});

type Job = {
  id: string;
  company_id: string;
  title: string;
  role_tag: string | null;
  description: string;
  package_lpa: number;
  location: string;
  openings: string;
  job_type: string;
  work_mode: string;
  branches: string[];
  courses: string[];
  min_cgpa: number;
  max_backlogs: number;
  graduation_years: number[];
  skills: string[];
  selection_process: string[];
  open_date: string;
  deadline: string;
  drive_date: string | null;
  doc_url: string | null;
  status: string;
  companies: { name: string } | null;
};

const JOB_TYPES = ["Full Time", "Internship", "Internship + PPO", "Contract"] as const;
const WORK_MODES = ["On-site", "Hybrid", "Remote"] as const;
const STATUSES = ["draft", "open", "closed"] as const;

type Form = {
  company_id: string;
  title: string;
  role_tag: string;
  description: string;
  package_lpa: string;
  location: string;
  openings: string;
  job_type: string;
  work_mode: string;
  branches: string;
  courses: string;
  min_cgpa: string;
  max_backlogs: string;
  graduation_years: string;
  skills: string;
  selection_process: string;
  open_date: string;
  deadline: string;
  drive_date: string;
  doc_url: string;
  status: string;
};

const today = () => new Date().toISOString().slice(0, 10);

const EMPTY: Form = {
  company_id: "",
  title: "",
  role_tag: "",
  description: "",
  package_lpa: "0",
  location: "",
  openings: "1",
  job_type: "Full Time",
  work_mode: "On-site",
  branches: "",
  courses: "",
  min_cgpa: "0",
  max_backlogs: "0",
  graduation_years: String(new Date().getFullYear()),
  skills: "",
  selection_process: "Aptitude Test, Technical Interview, HR Interview",
  open_date: today(),
  deadline: today(),
  drive_date: "",
  doc_url: "",
  status: "open",
};

function toForm(j: Job): Form {
  return {
    company_id: j.company_id,
    title: j.title,
    role_tag: j.role_tag ?? "",
    description: j.description ?? "",
    package_lpa: String(j.package_lpa ?? 0),
    location: j.location ?? "",
    openings: j.openings ?? "1",
    job_type: j.job_type ?? "Full Time",
    work_mode: j.work_mode ?? "On-site",
    branches: (j.branches ?? []).join(", "),
    courses: (j.courses ?? []).join(", "),
    min_cgpa: String(j.min_cgpa ?? 0),
    max_backlogs: String(j.max_backlogs ?? 0),
    graduation_years: (j.graduation_years ?? []).join(", "),
    skills: (j.skills ?? []).join(", "),
    selection_process: (j.selection_process ?? []).join(", "),
    open_date: j.open_date,
    deadline: j.deadline,
    drive_date: j.drive_date ?? "",
    doc_url: j.doc_url ?? "",
    status: j.status,
  };
}

function Page() {
  const search0 = Route.useSearch();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [formOpen, setFormOpen] = useState(search0.new === "1");
  const [editing, setEditing] = useState<Job | null>(null);
  const [form, setForm] = useState<Form>({ ...EMPTY });
  const [viewing, setViewing] = useState<Job | null>(null);
  const [deleting, setDeleting] = useState<Job | null>(null);
  const [applicantsOf, setApplicantsOf] = useState<Job | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select(
          "id, company_id, title, role_tag, description, package_lpa, location, openings, job_type, work_mode, branches, courses, min_cgpa, max_backlogs, graduation_years, skills, selection_process, open_date, deadline, drive_date, doc_url, status, companies(name)",
        )
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as Job[];
    },
  });

  const { data: companies } = useQuery({
    queryKey: ["admin-companies-options"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("id, name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: applicants, isLoading: applicantsLoading } = useQuery({
    queryKey: ["admin-job-applicants", applicantsOf?.id],
    enabled: !!applicantsOf,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("id, status, applied_at, user_id")
        .eq("job_id", applicantsOf!.id)
        .order("applied_at", { ascending: false });
      if (error) throw error;
      const ids = (data ?? []).map((a) => a.user_id);
      const { data: students } = ids.length
        ? await supabase
            .from("student_profiles")
            .select("user_id, full_name, student_id, branch, cgpa")
            .in("user_id", ids)
        : { data: [] };
      const byId = new Map((students ?? []).map((s) => [s.user_id, s]));
      return (data ?? []).map((a) => ({ ...a, student: byId.get(a.user_id) ?? null }));
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-jobs"] });

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY, company_id: companies?.[0]?.id ?? "" });
    setFormOpen(true);
  };
  const openEdit = (j: Job) => {
    setEditing(j);
    setForm(toForm(j));
    setFormOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      const title = form.title.trim();
      if (!title) throw new Error("Job title is required.");
      if (!form.company_id) throw new Error("Select a company.");
      if (!form.description.trim()) throw new Error("Job description is required.");
      const pkg = Number(form.package_lpa);
      const cgpa = Number(form.min_cgpa);
      if (!Number.isFinite(pkg) || pkg < 0) throw new Error("Package must be a positive number.");
      if (!Number.isFinite(cgpa) || cgpa < 0 || cgpa > 10) throw new Error("Minimum CGPA must be between 0 and 10.");
      if (form.deadline < form.open_date) throw new Error("Deadline cannot be before the open date.");
      const payload = {
        company_id: form.company_id,
        title,
        role_tag: form.role_tag.trim() || null,
        description: form.description.trim(),
        package_lpa: pkg,
        location: form.location.trim() || "—",
        openings: form.openings.trim() || "1",
        job_type: form.job_type,
        work_mode: form.work_mode,
        branches: csvList(form.branches),
        courses: csvList(form.courses),
        min_cgpa: cgpa,
        max_backlogs: Number(form.max_backlogs) || 0,
        graduation_years: numberList(form.graduation_years),
        skills: csvList(form.skills),
        selection_process: csvList(form.selection_process),
        open_date: form.open_date,
        deadline: form.deadline,
        drive_date: form.drive_date || null,
        doc_url: form.doc_url.trim() || null,
        status: form.status,
      };
      if (editing) {
        const { error } = await supabase.from("jobs").update(payload).eq("id", editing.id);
        if (error) throw error;
        await audit("job.updated", "jobs", editing.id, title);
        return { notified: 0 };
      }
      const { data: created, error } = await supabase.from("jobs").insert(payload).select("id").single();
      if (error) throw error;
      await audit("job.created", "jobs", created?.id ?? null, title);
      let notified = 0;
      if (payload.status === "open") {
        const ids = await eligibleStudentIds(payload);
        notified = await notify(ids, {
          type: "job",
          title: "New placement drive",
          body: `${title} — apply before ${shortDate(payload.deadline)}.`,
          link: created?.id ? `/jobs/${created.id}` : "/jobs",
        });
      }
      return { notified };
    },
    onSuccess: (res) => {
      toast.success(
        editing
          ? "Drive updated."
          : `Drive created${res?.notified ? ` — ${res.notified} eligible student(s) notified.` : "."}`,
      );
      setFormOpen(false);
      setEditing(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: async ({ job, status }: { job: Job; status: string }) => {
      const { error } = await supabase.from("jobs").update({ status }).eq("id", job.id);
      if (error) throw error;
      await audit("job.status_changed", "jobs", job.id, `${job.title} → ${status}`);
    },
    onSuccess: () => {
      toast.success("Drive status updated.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (j: Job) => {
      const { error } = await supabase.from("jobs").delete().eq("id", j.id);
      if (error)
        throw new Error(
          error.message.includes("foreign key")
            ? "Students have already applied to this drive — close it instead of deleting."
            : error.message,
        );
      await audit("job.deleted", "jobs", j.id, j.title);
    },
    onSuccess: () => {
      toast.success("Drive deleted.");
      setDeleting(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const term = search.trim().toLowerCase();
  const rows = (data ?? []).filter(
    (r) =>
      (!term ||
        [r.title, r.role_tag, r.location, r.companies?.name].join(" ").toLowerCase().includes(term)) &&
      (!statusFilter || r.status === statusFilter) &&
      (!companyFilter || r.company_id === companyFilter),
  );

  const field = (key: keyof Form, label: string, props: Record<string, unknown> = {}) => (
    <div className="space-y-1.5">
      <Label htmlFor={`j-${key}`}>{label}</Label>
      <Input
        id={`j-${key}`}
        value={String(form[key] ?? "")}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        {...props}
      />
    </div>
  );

  const picker = (key: keyof Form, label: string, options: readonly string[]) => (
    <div className="space-y-1.5">
      <Label htmlFor={`j-${key}`}>{label}</Label>
      <select
        id={`j-${key}`}
        className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
        value={String(form[key])}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <AdminShell
      title="Jobs"
      subtitle={`${rows.length} placement drive${rows.length === 1 ? "" : "s"}`}
      actions={
        <div className="flex gap-1.5">
          <Button
            variant="secondary"
            size="sm"
            disabled={!rows.length}
            onClick={() =>
              downloadCsv(
                "jobs.csv",
                rows.map((r) => ({
                  company: r.companies?.name ?? "",
                  title: r.title,
                  role: r.role_tag ?? "",
                  location: r.location,
                  package_lpa: r.package_lpa,
                  openings: r.openings,
                  min_cgpa: r.min_cgpa,
                  deadline: r.deadline,
                  status: r.status,
                })),
              )
            }
          >
            Export CSV
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="size-4" /> Add
          </Button>
        </div>
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <Input
          value={search}
          maxLength={80}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search drives..."
          className="max-w-xs"
          aria-label="Search drives"
        />
        <select
          aria-label="Filter by company"
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
        >
          <option value="">All companies</option>
          {(companies ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by status"
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-2xl" />
      ) : rows.length === 0 ? (
        <p className="card-soft px-4 py-10 text-center text-sm text-muted-foreground">
          No placement drives match these filters.
        </p>
      ) : (
        <div className="card-soft overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                {["Drive", "Company", "Package", "Openings", "Min CGPA", "Deadline", "Status", "Actions"].map((h) => (
                  <th key={h} className="whitespace-nowrap px-4 py-3 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-accent/30">
                  <td className="px-4 py-3">
                    <p className="font-semibold">{r.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.role_tag ?? r.job_type} · {r.location}
                    </p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">{r.companies?.name ?? "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3">{lpa(r.package_lpa)}</td>
                  <td className="px-4 py-3">{r.openings}</td>
                  <td className="px-4 py-3">{Number(r.min_cgpa ?? 0).toFixed(1)}</td>
                  <td className="whitespace-nowrap px-4 py-3">{shortDate(r.deadline)}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <select
                      aria-label={`Status for ${r.title}`}
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                      value={r.status}
                      disabled={setStatus.isPending}
                      onChange={(e) => setStatus.mutate({ job: r, status: e.target.value })}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" aria-label="View drive" onClick={() => setViewing(r)}>
                        <Eye className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="View applicants"
                        onClick={() => setApplicantsOf(r)}
                      >
                        <Users className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label="Edit drive" onClick={() => openEdit(r)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label="Delete drive" onClick={() => setDeleting(r)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={(o) => !o && setFormOpen(false)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit placement drive" : "Add placement drive"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="j-company">Company *</Label>
              <select
                id="j-company"
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={form.company_id}
                onChange={(e) => setForm({ ...form, company_id: e.target.value })}
              >
                <option value="">Select company</option>
                {(companies ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            {field("title", "Job title *", { maxLength: 120 })}
            {field("role_tag", "Role tag", { maxLength: 60, placeholder: "Software Engineer" })}
            {picker("job_type", "Job type", JOB_TYPES)}
            {picker("work_mode", "Work mode", WORK_MODES)}
            {field("location", "Location", { maxLength: 80 })}
            {field("package_lpa", "Package (LPA)", { type: "number", step: "0.1", min: 0 })}
            {field("openings", "Openings", { maxLength: 20 })}
            {field("min_cgpa", "Minimum CGPA", { type: "number", step: "0.1", min: 0, max: 10 })}
            {field("max_backlogs", "Max backlogs", { type: "number", min: 0 })}
            {field("branches", "Eligible branches (comma separated)", { maxLength: 200 })}
            {field("courses", "Eligible courses (comma separated)", {
              maxLength: 160,
              placeholder: COURSES.join(", "),
            })}
            {field("graduation_years", "Graduation years (comma separated)", { maxLength: 60 })}
            {field("skills", "Skills (comma separated)", { maxLength: 300 })}
            {field("open_date", "Open date", { type: "date" })}
            {field("deadline", "Application deadline", { type: "date" })}
            {field("drive_date", "Drive date", { type: "date" })}
            {picker("status", "Status", STATUSES)}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="j-selection">Selection process (comma separated)</Label>
              <Input
                id="j-selection"
                maxLength={300}
                value={form.selection_process}
                onChange={(e) => setForm({ ...form, selection_process: e.target.value })}
              />
            </div>
            {field("doc_url", "Job description link", { maxLength: 300 })}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="j-desc">Description *</Label>
              <Textarea
                id="j-desc"
                rows={4}
                maxLength={4000}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? "Saving..." : editing ? "Save changes" : "Create drive"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewing?.title}</DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="space-y-3 text-sm">
              <dl className="grid gap-2 sm:grid-cols-2">
                {[
                  ["Company", viewing.companies?.name],
                  ["Type", `${viewing.job_type} · ${viewing.work_mode}`],
                  ["Location", viewing.location],
                  ["Package", lpa(viewing.package_lpa)],
                  ["Openings", viewing.openings],
                  ["Min CGPA", Number(viewing.min_cgpa ?? 0).toFixed(1)],
                  ["Max backlogs", String(viewing.max_backlogs)],
                  ["Open date", shortDate(viewing.open_date)],
                  ["Deadline", shortDate(viewing.deadline)],
                  ["Drive date", viewing.drive_date ? shortDate(viewing.drive_date) : "—"],
                  ["Branches", (viewing.branches ?? []).join(", ")],
                  ["Courses", (viewing.courses ?? []).join(", ")],
                  ["Graduation years", (viewing.graduation_years ?? []).join(", ")],
                  ["Skills", (viewing.skills ?? []).join(", ")],
                  ["Selection process", (viewing.selection_process ?? []).join(" → ")],
                ].map(([k, v]) => (
                  <div key={String(k)}>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">{k}</dt>
                    <dd>{v || "—"}</dd>
                  </div>
                ))}
              </dl>
              <p className="whitespace-pre-wrap text-muted-foreground">{viewing.description}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!applicantsOf} onOpenChange={(o) => !o && setApplicantsOf(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Applicants — {applicantsOf?.title}</DialogTitle>
          </DialogHeader>
          {applicantsLoading ? (
            <Skeleton className="h-40 w-full rounded-xl" />
          ) : (applicants ?? []).length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No applications yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    {["Student", "ID", "Branch", "CGPA", "Status", "Applied"].map((h) => (
                      <th key={h} className="px-2 py-2 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(applicants ?? []).map((a) => (
                    <tr key={a.id}>
                      <td className="px-2 py-2">{a.student?.full_name ?? "Student"}</td>
                      <td className="px-2 py-2">{a.student?.student_id ?? "—"}</td>
                      <td className="px-2 py-2">{a.student?.branch ?? "—"}</td>
                      <td className="px-2 py-2">{a.student ? Number(a.student.cgpa).toFixed(2) : "—"}</td>
                      <td className="px-2 py-2">
                        <StatusBadge status={a.status} />
                      </td>
                      <td className="whitespace-nowrap px-2 py-2">{shortDate(a.applied_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this placement drive?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.title} will be permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleting && remove.mutate(deleting)} disabled={remove.isPending}>
              {remove.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}
