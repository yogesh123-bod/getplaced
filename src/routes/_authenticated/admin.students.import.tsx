import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/placement/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { downloadCsv, parseCsv } from "@/lib/format";
import { adminBulkImportStudents } from "@/lib/auth.functions";

export const Route = createFileRoute("/_authenticated/admin/students/import")({
  head: () => ({
    meta: [
      { title: "Bulk Student Import — Placement Cell" },
      { name: "description", content: "Import student accounts from a CSV file with validation and duplicate detection." },
      { property: "og:title", content: "Bulk Student Import — Placement Cell" },
      { property: "og:description", content: "Validate and import student records from CSV." },
    ],
  }),
  component: Page,
});

const FIELDS = [
  "student_id",
  "full_name",
  "email",
  "phone",
  "course",
  "branch",
  "cgpa",
  "backlog_count",
  "graduation_year",
] as const;

const ALIASES: Record<string, string> = {
  name: "full_name",
  student_name: "full_name",
  id: "student_id",
  studentid: "student_id",
  contact_number: "phone",
  contact: "phone",
  mobile: "phone",
  batch: "graduation_year",
  backlogs: "backlog_count",
  backlog: "backlog_count",
  department: "branch",
};

function normalizeRow(raw: Record<string, string>) {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    const key = ALIASES[k] ?? k;
    if ((FIELDS as readonly string[]).includes(key)) out[key] = v;
  }
  return out;
}

function rowErrors(row: Record<string, string>) {
  const errors: string[] = [];
  if (!row["student_id"]) errors.push("Student ID missing");
  if (!row["full_name"] || row["full_name"].length < 2) errors.push("Name missing");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(row["email"] ?? "")) errors.push("Invalid email");
  const cgpa = Number(row["cgpa"]);
  if (!Number.isFinite(cgpa) || cgpa < 0 || cgpa > 10) errors.push("CGPA must be 0–10");
  if (row["backlog_count"] && !Number.isFinite(Number(row["backlog_count"]))) errors.push("Invalid backlogs");
  if (row["graduation_year"] && !Number.isFinite(Number(row["graduation_year"]))) errors.push("Invalid batch");
  return errors;
}

type Preview = { row: Record<string, string>; errors: string[]; duplicate: boolean };

function Page() {
  const [preview, setPreview] = useState<Preview[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [results, setResults] = useState<
    { row: number; student_id: string; status: string; message: string; password?: string }[] | null
  >(null);
  const runImport = useServerFn(adminBulkImportStudents);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!/\.csv$/i.test(file.name)) {
      toast.error("Please upload a .csv file (export from Excel as CSV).");
      return;
    }
    if (file.size > 2_000_000) {
      toast.error("File too large (max 2 MB).");
      return;
    }
    const rows = parseCsv(await file.text()).map(normalizeRow);
    if (!rows.length) {
      toast.error("No data rows detected in the file.");
      return;
    }
    const seen = new Set<string>();
    const list: Preview[] = rows.slice(0, 500).map((row) => {
      const key = `${(row["student_id"] ?? "").toLowerCase()}|${(row["email"] ?? "").toLowerCase()}`;
      const duplicate = seen.has(key);
      seen.add(key);
      return { row, errors: rowErrors(row), duplicate };
    });
    setFileName(file.name);
    setResults(null);
    setPreview(list);
  };

  const valid = (preview ?? []).filter((p) => p.errors.length === 0 && !p.duplicate);

  const doImport = useMutation({
    mutationFn: async () => {
      const res = await runImport({ data: { rows: valid.map((v) => v.row) } });
      return res.results;
    },
    onSuccess: (res) => {
      setResults(res);
      const imported = res.filter((r) => r.status === "imported").length;
      toast.success(`${imported} of ${res.length} records imported.`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AdminShell
      title="Bulk student import"
      subtitle="CSV upload with validation"
      actions={
        <Button asChild variant="secondary" size="sm">
          <Link to="/admin/students">Back to students</Link>
        </Button>
      }
    >
      <section className="card-soft p-4">
        <h2 className="text-sm font-bold">1. Upload file</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Columns: Student ID, Name, Email, Phone, Course, Branch, CGPA, Backlog Count, Graduation Year (Batch).
          Excel files should be saved as CSV first.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Input
            type="file"
            accept=".csv,text/csv"
            className="max-w-xs"
            aria-label="Upload student CSV"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              downloadCsv("student-import-template.csv", [
                {
                  student_id: "22BCA1048",
                  full_name: "Priya Verma",
                  email: "priya.verma@college.edu.in",
                  phone: "+91 90000 00000",
                  course: "BCA",
                  branch: "BCA",
                  cgpa: "8.10",
                  backlog_count: "0",
                  graduation_year: "2026",
                },
              ])
            }
          >
            Download sample template
          </Button>
        </div>
        {fileName && <p className="mt-2 text-xs text-muted-foreground">Loaded: {fileName}</p>}
      </section>

      {preview && (
        <section className="card-soft mt-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold">2. Preview &amp; validate</h2>
            <p className="text-xs text-muted-foreground">
              {preview.length} detected · {valid.length} valid ·{" "}
              {preview.filter((p) => p.errors.length).length} invalid ·{" "}
              {preview.filter((p) => p.duplicate).length} duplicate in file
            </p>
          </div>
          <div className="mt-3 max-h-80 overflow-auto rounded-xl border border-border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-secondary text-left uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">#</th>
                  {FIELDS.map((f) => (
                    <th key={f} className="whitespace-nowrap px-3 py-2">
                      {f.replace(/_/g, " ")}
                    </th>
                  ))}
                  <th className="px-3 py-2">Issues</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {preview.map((p, i) => {
                  const bad = p.errors.length > 0 || p.duplicate;
                  return (
                    <tr key={i} className={bad ? "bg-destructive/5" : ""}>
                      <td className="px-3 py-2">{i + 1}</td>
                      {FIELDS.map((f) => (
                        <td key={f} className="max-w-[160px] truncate px-3 py-2">
                          {p.row[f] ?? "—"}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-destructive">
                        {[...p.errors, ...(p.duplicate ? ["Duplicate row in file"] : [])].join("; ") || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex gap-2">
            <Button onClick={() => doImport.mutate()} disabled={!valid.length || doImport.isPending}>
              Import {valid.length} valid records
            </Button>
            <Button variant="secondary" onClick={() => setPreview(null)}>
              Clear
            </Button>
          </div>
        </section>
      )}

      {results && (
        <section className="card-soft mt-4 p-4">
          <h2 className="text-sm font-bold">3. Import summary</h2>
          <div className="mt-2 grid gap-3 sm:grid-cols-4">
            {[
              ["Total", results.length],
              ["Imported", results.filter((r) => r.status === "imported").length],
              ["Duplicates", results.filter((r) => r.status === "duplicate").length],
              ["Failed", results.filter((r) => r.status === "error").length],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-xl bg-secondary p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
                <p className="text-lg font-bold">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 max-h-72 overflow-auto rounded-xl border border-border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-secondary text-left uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Row</th>
                  <th className="px-3 py-2">Student ID</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Message</th>
                  <th className="px-3 py-2">Temp password</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {results.map((r) => (
                  <tr key={r.row}>
                    <td className="px-3 py-2">{r.row}</td>
                    <td className="px-3 py-2">{r.student_id}</td>
                    <td className="px-3 py-2 font-semibold">{r.status}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.message}</td>
                    <td className="px-3 py-2 font-mono">{r.password ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button
            className="mt-3"
            variant="secondary"
            size="sm"
            onClick={() => downloadCsv("import-results.csv", results as unknown as Record<string, unknown>[])}
          >
            Download results (with temporary passwords)
          </Button>
        </section>
      )}
    </AdminShell>
  );
}
