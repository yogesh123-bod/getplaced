import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Megaphone, Pin, Sparkles } from "lucide-react";
import { StudentShell, NotificationBell } from "@/components/placement/StudentShell";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { greeting, initials, timeAgo } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Home — Campus Placement Portal" },
      {
        name: "description",
        content: "Placement cell announcements, pinned recruitment drives and campus updates for students.",
      },
      { property: "og:title", content: "Home — Campus Placement Portal" },
      { property: "og:description", content: "Placement announcements and campus recruitment updates." },
    ],
  }),
  component: HomePage,
});

const EMOJIS = ["👍", "❤️", "🎉"] as const;

function HomePage() {
  const { session } = useSession();
  const queryClient = useQueryClient();

  const { data: announcements, isLoading } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: reactions } = useQuery({
    queryKey: ["announcement_reactions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("announcement_reactions").select("*");
      if (error) throw error;
      return data;
    },
  });

  const toggle = useMutation({
    mutationFn: async ({ announcementId, emoji }: { announcementId: string; emoji: string }) => {
      const mine = (reactions ?? []).find(
        (r) => r.announcement_id === announcementId && r.user_id === session.userId && r.emoji === emoji,
      );
      if (mine) {
        const { error } = await supabase.from("announcement_reactions").delete().eq("id", mine.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("announcement_reactions")
          .insert({ announcement_id: announcementId, user_id: session.userId!, emoji });
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["announcement_reactions"] }),
  });

  const count = (id: string, emoji: string) =>
    (reactions ?? []).filter((r) => r.announcement_id === id && r.emoji === emoji).length;
  const mine = (id: string, emoji: string) =>
    (reactions ?? []).some((r) => r.announcement_id === id && r.emoji === emoji && r.user_id === session.userId);

  const pinned = (announcements ?? []).filter((a) => a.pinned);
  const latest = (announcements ?? []).filter((a) => !a.pinned);
  const firstName = (session.profile?.full_name ?? "Student").split(" ")[0];

  const reactionRow = (id: string) => (
    <div className="mt-3 flex items-center gap-2">
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => toggle.mutate({ announcementId: id, emoji })}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors",
            mine(id, emoji)
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-secondary text-secondary-foreground hover:bg-accent",
          )}
        >
          <span aria-hidden>{emoji}</span>
          {count(id, emoji)}
        </button>
      ))}
    </div>
  );

  return (
    <StudentShell>
      <header className="border-b border-border bg-card px-4 py-4 lg:px-8">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-full gradient-brand text-sm font-bold text-primary-foreground">
            {initials(session.profile?.full_name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">{greeting()},</p>
            <p className="truncate text-base font-bold">{firstName} 👋</p>
          </div>
          <NotificationBell />
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-5 lg:px-8">
        <section className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "CGPA", value: Number(session.profile?.cgpa ?? 0).toFixed(2) },
            { label: "Course", value: session.profile?.course ?? "—" },
            { label: "Placement", value: session.profile?.placement_status ?? "—" },
          ].map((s) => (
            <div key={s.label} className="card-soft px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{s.label}</p>
              <p className="mt-0.5 text-base font-bold">{s.value}</p>
            </div>
          ))}
        </section>

        <section>
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-bold">
            <Pin className="size-4 text-primary" /> Pinned Announcement
          </h2>
          {isLoading ? (
            <Skeleton className="h-32 w-full rounded-2xl" />
          ) : pinned.length === 0 ? (
            <p className="card-soft px-4 py-6 text-center text-sm text-muted-foreground">
              No pinned announcements right now.
            </p>
          ) : (
            pinned.map((a) => (
              <article key={a.id} className="card-soft mb-3 border-primary/25 bg-primary/[0.03] p-4">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl gradient-brand">
                    <Megaphone className="size-5 text-primary-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold">{a.title}</h3>
                      <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                        📌 PINNED
                      </span>
                    </div>
                    {a.company && <p className="text-xs font-medium text-primary">{a.company}</p>}
                    <p className="mt-1.5 text-sm text-muted-foreground">{a.message}</p>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {a.author_name} · {timeAgo(a.created_at)}
                    </p>
                    {reactionRow(a.id)}
                  </div>
                </div>
              </article>
            ))
          )}
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold">Latest Announcements</h2>
            <Link to="/notifications" className="text-xs font-semibold text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {isLoading ? (
              <>
                <Skeleton className="h-24 w-full rounded-2xl" />
                <Skeleton className="h-24 w-full rounded-2xl" />
              </>
            ) : latest.length === 0 ? (
              <p className="card-soft px-4 py-6 text-center text-sm text-muted-foreground">
                No announcements published yet.
              </p>
            ) : (
              latest.map((a) => (
                <article key={a.id} className="card-soft p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
                      PC
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold">{a.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{a.message}</p>
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        {a.author_name} · {timeAgo(a.created_at)}
                      </p>
                      {reactionRow(a.id)}
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <Link
          to="/jobs"
          className="flex items-center gap-3 rounded-2xl gradient-brand px-4 py-4 text-primary-foreground shadow-float"
        >
          <Sparkles className="size-5" />
          <div className="flex-1">
            <p className="text-sm font-bold">See placement drives open for you</p>
            <p className="text-xs opacity-80">Eligibility is calculated automatically from your profile</p>
          </div>
        </Link>
      </div>
    </StudentShell>
  );
}
