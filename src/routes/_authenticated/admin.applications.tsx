import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/placement/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { downloadCsv, shortDate } from "@/lib/format";
import {
  APPLICATION_STATUSES,
  setApplicationStatus,
  type ApplicationStatus,
} from "@/lib/admin-api";

export const Route = createFileRoute("/_authenticated/admin/applications")({
  head: () => ({
    meta: [
      { title: "Applications — Placement Cell" },
      { name: "description", content: "All student applications across every placement drive." },
      { property: "og:title", content: "Applications — Placement Cell" },
      { property: "og:description", content: "All student applications across every placement drive." },
    ],
  }),
  component: Page,
});

type Row = {
  id: string;
  job_id: string;
  user_id: string;
  status: string;
  applied_at: string;
  student_name: string;
  student_code: string;
  branch: string;
  job_title: string;
  company: string;
};

function Page() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [jobFilter, setJobFilter] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<ApplicationStatus>("Shortlisted");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-applications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("id, job_id, user_id, status, applied_at, jobs(title, companies(name))")
        .order("applied_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      const apps = (data ?? []) as unknown as {
        id: string;
        job_id: string;
        user_id: string;
        status: string;
        applied_at: string;
        jobs: { title: string; companies: { name: string } | null } | null;
      }[];
      const ids = Array.from(new Set(apps.map((a) => a.user_id)));
      const { data: students } = ids.length
        ? await supabase
            .from("student_profiles")
            .select("user_id, full_name, student_id, branch")
            .in("user_id", ids)
        : { data: [] };
      const byId = new Map((students ?? []).map((s) => [s.user_id, s]));
      return apps.map<Row>((a) => ({
        id: a.id,
        job_id: a.job_id,
        user_id: a.user_id,
        status: a.status,
        applied_at: a.applied_at,
        student_name: byId.get(a.user_id)?.full_name ?? "Student",
        student_code: byId.get(a.user_id)?.student_id ?? "—",
        branch: byId.get(a.user_id)?.branch ?? "—",
        job_title: a.jobs?.title ?? "—",
        company: a.jobs?.companies?.name ?? "—",
      }));
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-applications"] });
    qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
  };

  const update = useMutation({
    mutationFn: async ({ row, status }: { row: Row; status: ApplicationStatus }) => {
      await setApplicationStatus(
        { id: row.id, user_id: row.user_id, status: row.status, label: `${row.company} · ${row.job_title}` },
        status,
      );
    },
    onSuccess: () => {
      toast.success("Status updated and student notified.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bulk = useMutation({
    mutationFn: async () => {
      const rows = (data ?? []).filter((r) => selected.includes(r.id));
      for (const row of rows) {
        await setApplicationStatus(
          { id: row.id, user_id: row.user_id, status: row.status, label: `${row.company} · ${row.job_title}` },
          bulkStatus,
        );
      }
      return rows.length;
    },
    onSuccess: (count) => {
      toast.success(`${count} application(s) updated to "${bulkStatus}".`);
      setSelected([]);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const term = search.trim().toLowerCase();
  const rows = (data ?? []).filter(
    (r) =>
      (!term ||
        [r.student_name, r.student_code, r.branch, r.job_title, r.company].join(" ").toLowerCase().includes(term)) &&
      (!statusFilter || r.status === statusFilter) &&
      (!jobFilter || r.job_id === jobFilter),
  );
  const jobs = Array.from(new Map((data ?? []).map((r) => [r.job_id, `${r.company} · ${r.job_title}`])).entries());
  const allSelected = rows.length > 0 && rows.every((r) => selected.includes(r.id));

  return (
    <AdminShell
      title="Applications"
      subtitle={`${rows.length} application${rows.length === 1 ? "" : "s"}`}
      actions={
        <Button
          variant="secondary"
          size="sm"
          disabled={!rows.length}
          onClick={() =>
            downloadCsv(
              "applications.csv",
              rows.map((r) => ({
                student: r.student_name,
                student_id: r.student_code,
                branch: r.branch,
                company: r.company,
                job: r.job_title,
                status: r.status,
                applied_at: r.applied_at,
              })),
            )
          }
        >
          Export CSV
        </Button>
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <Input
          value={search}
          maxLength={80}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search students or drives..."
          className="max-w-xs"
          aria-label="Search applications"
        />
        <select
          aria-label="Filter by drive"
          className="h-9 max-w-[240px] rounded-md border border-input bg-background px-2 text-sm"
          value={jobFilter}
          onChange={(e) => setJobFilter(e.target.value)}
        >
          <option value="">All drives</option>
          {jobs.map(([id, label]) => (
            <option key={id} value={id}>
              {label}
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
          {APPLICATION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {selected.length > 0 && (
        <div className="card-soft mb-3 flex flex-wrap items-center gap-2 p-3 text-sm">
          <span className="font-semibold">{selected.length} selected</span>
          <select
            aria-label="Bulk status"
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value as ApplicationStatus)}
          >
            {APPLICATION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <Button size="sm" onClick={() => bulk.mutate()} disabled={bulk.isPending}>
            {bulk.isPending ? "Updating..." : "Apply to selected"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
            Clear
          </Button>
        </div>
      )}

      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-2xl" />
      ) : rows.length === 0 ? (
        <p className="card-soft px-4 py-10 text-center text-sm text-muted-foreground">
          No applications match these filters.
        </p>
      ) : (
        <div className="card-soft overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label="Select all applications"
                    checked={allSelected}
                    onChange={(e) => setSelected(e.target.checked ? rows.map((r) => r.id) : [])}
                  />
                </th>
                {["Student", "Branch", "Drive", "Applied", "Status"].map((h) => (
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
                    <input
                      type="checkbox"
                      aria-label={`Select application of ${r.student_name}`}
                      checked={selected.includes(r.id)}
                      onChange={(e) =>
                        setSelected((prev) =>
                          e.target.checked ? [...prev, r.id] : prev.filter((id) => id !== r.id),
                        )
                      }
                    />
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{r.student_name}</p>
                    <p className="text-xs text-muted-foreground">{r.student_code}</p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">{r.branch}</td>
                  <td className="px-4 py-3">
                    <p>{r.company}</p>
                    <p className="text-xs text-muted-foreground">{r.job_title}</p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">{shortDate(r.applied_at)}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <select
                      aria-label={`Status for ${r.student_name}`}
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                      value={r.status}
                      disabled={update.isPending}
                      onChange={(e) => update.mutate({ row: r, status: e.target.value as ApplicationStatus })}
                    >
                      {APPLICATION_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
