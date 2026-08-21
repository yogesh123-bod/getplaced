import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AdminShell } from "@/components/placement/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { downloadCsv } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/students")({
  head: () => ({
    meta: [
      { title: "Students — Placement Cell" },
      { name: "description", content: "Manage student records, academic data and placement status." },
      { property: "og:title", content: "Students — Placement Cell" },
      { property: "og:description", content: "Manage student records, academic data and placement status." },
    ],
  }),
  component: Page,
});

const COLUMNS = ["student_id", "full_name", "email", "course", "branch", "cgpa", "backlog_count", "graduation_year", "placement_status"] as const;

function Page() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-students"],
    queryFn: async () => {
      const { data, error } = await supabase.from("student_profiles").select("student_id, full_name, email, course, branch, cgpa, backlog_count, graduation_year, placement_status").limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as Record<string, unknown>[];
    },
  });

  const term = search.trim().toLowerCase();
  const rows = (data ?? []).filter((row) =>
    term ? COLUMNS.some((c) => String(row[c] ?? "").toLowerCase().includes(term)) : true,
  );

  return (
    <AdminShell
      title="Students"
      subtitle="Student records"
      actions={
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            downloadCsv(
              "students.csv",
              rows.map((r) => Object.fromEntries(COLUMNS.map((c) => [c, r[c] ?? ""]))),
            )
          }
          disabled={rows.length === 0}
        >
          Export CSV
        </Button>
      }
    >
      <Input
        value={search}
        maxLength={80}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search students..."
        className="mb-4 max-w-sm"
        aria-label="Search students"
      />
      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-2xl" />
      ) : rows.length === 0 ? (
        <p className="card-soft px-4 py-10 text-center text-sm text-muted-foreground">
          Nothing to show yet.
        </p>
      ) : (
        <div className="card-soft overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                {COLUMNS.map((c) => (
                  <th key={c} className="whitespace-nowrap px-4 py-3 font-semibold">
                    {c.replace(/_/g, " ")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row, i) => (
                <tr key={i} className="hover:bg-accent/30">
                  {COLUMNS.map((c) => (
                    <td key={c} className="max-w-[240px] truncate px-4 py-3">
                      {String(row[c] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
