import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminShell } from "@/components/placement/AdminShell";
import { useSession } from "@/lib/session";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Placement Cell" },
      { name: "description", content: "Placement cell account settings and portal configuration." },
      { property: "og:title", content: "Settings — Placement Cell" },
      { property: "og:description", content: "Placement cell account settings and configuration." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { session } = useSession();

  return (
    <AdminShell title="Settings" subtitle="Account and portal configuration">
      <section className="card-soft divide-y divide-border">
        <h2 className="px-4 py-3 text-sm font-bold">Signed-in account</h2>
        {[
          ["Email", session.email ?? "—"],
          ["Role", session.role ?? "—"],
        ].map(([label, value]) => (
          <div key={label} className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-semibold">{value}</span>
          </div>
        ))}
      </section>

      <section className="card-soft mt-4 p-4">
        <h2 className="text-sm font-bold">Security</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Student self-registration is disabled — accounts are provisioned by the placement cell only.
        </p>
        <Button asChild size="sm" className="mt-3">
          <Link to="/change-password">Change password</Link>
        </Button>
      </section>
    </AdminShell>
  );
}
