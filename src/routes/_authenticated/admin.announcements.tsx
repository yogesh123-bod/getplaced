import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AdminShell } from "@/components/placement/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { downloadCsv } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/announcements")({
  head: () => ({
    meta: [
      { title: "Announcements — Placement Cell" },
      { name: "description", content: "Publish and pin placement cell announcements for students." },
      { property: "og:title", content: "Announcements — Placement Cell" },
      { property: "og:description", content: "Publish and pin placement cell announcements for students." },
    ],
  }),
  component: Page,
});

const COLUMNS = ["title", "company", "author_name", "pinned", "created_at"] as const;

function Page() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-announcements"],
    queryFn: async () => {
      const { data, error } = await supabase.from("announcements").select("title, company, author_name, pinned, created_at").limit(500);
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
      title="Announcements"
      subtitle="Student announcements"
      actions={
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            downloadCsv(
              "announcements.csv",
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
        placeholder="Search announcements..."
        className="mb-4 max-w-sm"
        aria-label="Search announcements"
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
