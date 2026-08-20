import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellRing, CalendarClock, CheckCheck, Megaphone, Target, Briefcase } from "lucide-react";
import { StudentShell, PageHeader } from "@/components/placement/StudentShell";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { timeAgo } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Campus Placement Portal" },
      {
        name: "description",
        content: "New placement drives, shortlist updates, practice tests and deadline reminders.",
      },
      { property: "og:title", content: "Notifications — Campus Placement Portal" },
      { property: "og:description", content: "Placement drive alerts and application status updates." },
    ],
  }),
  component: NotificationsPage,
});

const ICONS: Record<string, React.ElementType> = {
  job: Briefcase,
  application: BellRing,
  announcement: Megaphone,
  test: Target,
  deadline: CalendarClock,
};

function NotificationsPage() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", session.userId],
    enabled: !!session.userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", session.userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const markAll = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", session.userId!)
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const open = useMutation({
    mutationFn: async (n: { id: string; is_read: boolean }) => {
      if (n.is_read) return;
      await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
    },
    onSuccess: invalidate,
  });

  const unread = (data ?? []).filter((n) => !n.is_read).length;

  return (
    <StudentShell>
      <PageHeader
        title="Notifications"
        subtitle={unread > 0 ? `${unread} unread` : "You're all caught up"}
        right={
          unread > 0 ? (
            <Button size="sm" variant="secondary" onClick={() => markAll.mutate()}>
              <CheckCheck className="size-4" /> Mark all
            </Button>
          ) : undefined
        }
      />
      <div className="mx-auto max-w-3xl space-y-2.5 px-4 py-4 lg:px-8">
        {isLoading ? (
          <>
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
          </>
        ) : (data ?? []).length === 0 ? (
          <div className="card-soft px-4 py-10 text-center">
            <Bell className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-2 text-sm font-semibold">No notifications yet.</p>
          </div>
        ) : (
          (data ?? []).map((n) => {
            const Icon = ICONS[n.type] ?? Bell;
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => {
                  open.mutate({ id: n.id, is_read: n.is_read });
                  if (n.link === "/applications") navigate({ to: "/applications" });
                  else if (n.link === "/jobs") navigate({ to: "/jobs" });
                  else if (n.link === "/tests") navigate({ to: "/tests" });
                  else if (n.link === "/home") navigate({ to: "/home" });
                }}
                className={cn(
                  "card-soft flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-accent/40",
                  !n.is_read && "border-primary/25 bg-primary/[0.04]",
                )}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold">{n.title}</span>
                    {!n.is_read && <span className="size-2 shrink-0 rounded-full bg-primary" />}
                  </span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">{n.body}</span>
                  <span className="mt-1 block text-[11px] text-muted-foreground">
                    {timeAgo(n.created_at)}
                  </span>
                </span>
              </button>
            );
          })
        )}
      </div>
    </StudentShell>
  );
}
