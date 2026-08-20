import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, KeyRound, LogOut, Pencil, ShieldCheck } from "lucide-react";
import { StudentShell, PageHeader, NotificationBell } from "@/components/placement/StudentShell";
import { useSession, useSignOut } from "@/lib/session";
import { initials } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/account/")({
  head: () => ({
    meta: [
      { title: "My Account — Campus Placement Portal" },
      {
        name: "description",
        content: "Your placement profile: course, CGPA, contact details, backlog and placement status.",
      },
      { property: "og:title", content: "My Account — Campus Placement Portal" },
      { property: "og:description", content: "Placement profile, academic details and account settings." },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { session } = useSession();
  const signOut = useSignOut();
  const navigate = useNavigate();
  const p = session.profile;

  return (
    <StudentShell>
      <PageHeader title="My Account" right={<NotificationBell />} />
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-4 lg:px-8">
        <section className="card-soft gradient-brand p-5 text-primary-foreground">
          <div className="flex items-center gap-3">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-primary-foreground/15 text-lg font-bold">
              {initials(p?.full_name)}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold">{p?.full_name}</h2>
              <p className="text-sm opacity-85">{p?.student_id}</p>
              <span className="mt-1.5 inline-block rounded-full bg-primary-foreground/15 px-2.5 py-0.5 text-[11px] font-semibold">
                {p?.placement_status}
              </span>
            </div>
          </div>
        </section>

        <section className="card-soft divide-y divide-border">
          <h3 className="px-4 py-3 text-sm font-bold">Profile information</h3>
          {[
            ["Course / Branch", `${p?.course ?? "—"} · ${p?.branch ?? "—"}`],
            ["College", p?.college ?? "—"],
            ["CGPA", Number(p?.cgpa ?? 0).toFixed(2)],
            ["Graduation year", String(p?.graduation_year ?? "—")],
            ["Backlogs", p?.backlog_count ? `${p.backlog_count} active` : "No active backlogs"],
            ["Email", p?.email ?? "—"],
            ["Phone", p?.phone ?? "—"],
            ["Placement status", p?.placement_status ?? "—"],
          ].map(([label, value]) => (
            <div key={label} className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
              <span className="text-muted-foreground">{label}</span>
              <span className="text-right font-semibold">{value}</span>
            </div>
          ))}
        </section>

        <section className="card-soft divide-y divide-border">
          <Link
            to="/account/edit"
            className="flex items-center gap-3 px-4 py-3.5 text-sm font-medium hover:bg-accent/40"
          >
            <Pencil className="size-4 text-primary" /> Edit Profile
            <ChevronRight className="ml-auto size-4 text-muted-foreground" />
          </Link>
          <Link
            to="/change-password"
            className="flex items-center gap-3 px-4 py-3.5 text-sm font-medium hover:bg-accent/40"
          >
            <KeyRound className="size-4 text-primary" /> Change Password
            <ChevronRight className="ml-auto size-4 text-muted-foreground" />
          </Link>
          <button
            type="button"
            onClick={() =>
              toast.info("Your academic records are visible only to you and the placement cell.")
            }
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm font-medium hover:bg-accent/40"
          >
            <ShieldCheck className="size-4 text-primary" /> Privacy Settings
            <ChevronRight className="ml-auto size-4 text-muted-foreground" />
          </button>
        </section>

        <p className="px-1 text-[11px] text-muted-foreground">
          CGPA, branch, backlog and placement status are maintained by the placement cell and cannot be
          edited by students.
        </p>

        <Button
          variant="outline"
          className="w-full text-destructive"
          onClick={async () => {
            await signOut();
            navigate({ to: "/login", replace: true });
          }}
        >
          <LogOut className="size-4" /> Logout
        </Button>
      </div>
    </StudentShell>
  );
}
