import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Pin, PinOff, Plus, Trash2, Pencil } from "lucide-react";
import { AdminShell } from "@/components/placement/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { shortDate, timeAgo } from "@/lib/format";
import { activeStudentIds, audit, COURSES, notify } from "@/lib/admin-api";

export const Route = createFileRoute("/_authenticated/admin/announcements")({
  head: () => ({
    meta: [
      { title: "Announcements — Placement Cell" },
      { name: "description", content: "Publish, pin and manage placement announcements for students." },
      { property: "og:title", content: "Announcements — Placement Cell" },
      { property: "og:description", content: "Publish, pin and manage placement announcements." },
    ],
  }),
  component: Page,
});

type Announcement = {
  id: string;
  title: string;
  message: string;
  company: string | null;
  drive_type: string | null;
  target_course: string | null;
  pinned: boolean;
  publish_at: string;
  expires_at: string | null;
  created_at: string;
};

const EMPTY = {
  title: "",
  message: "",
  company: "",
  drive_type: "",
  target_course: "",
  pinned: false,
  publish_at: "",
  expires_at: "",
};

function Page() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-announcements"],
    queryFn: async () => {
      const [ann, reactions] = await Promise.all([
        supabase
          .from("announcements")
          .select("*")
          .order("pinned", { ascending: false })
          .order("publish_at", { ascending: false }),
        supabase.from("announcement_reactions").select("announcement_id, emoji"),
      ]);
      if (ann.error) throw ann.error;
      const counts: Record<string, Record<string, number>> = {};
      for (const r of reactions.data ?? []) {
        counts[r.announcement_id] = counts[r.announcement_id] ?? {};
        counts[r.announcement_id]![r.emoji] = (counts[r.announcement_id]![r.emoji] ?? 0) + 1;
      }
      return { rows: (ann.data ?? []) as Announcement[], counts };
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-announcements"] });

  const save = useMutation({
    mutationFn: async () => {
      if (form.title.trim().length < 3) throw new Error("Title must be at least 3 characters");
      if (form.message.trim().length < 3) throw new Error("Message must be at least 3 characters");
      const payload = {
        title: form.title.trim(),
        message: form.message.trim(),
        company: form.company.trim() || null,
        drive_type: form.drive_type.trim() || null,
        target_course: form.target_course.trim() || null,
        pinned: form.pinned,
        publish_at: form.publish_at ? new Date(form.publish_at).toISOString() : new Date().toISOString(),
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      };
      if (editing) {
        const { error } = await supabase.from("announcements").update(payload).eq("id", editing.id);
        if (error) throw error;
        await audit("announcement.updated", "announcements", editing.id, payload.title);
        return { created: false, notified: 0 };
      }
      const { data: inserted, error } = await supabase
        .from("announcements")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;
      await audit("announcement.published", "announcements", inserted.id, payload.title);
      const ids = await activeStudentIds(
        payload.target_course ? { course: payload.target_course } : undefined,
      );
      const notified = await notify(ids, {
        type: "announcement",
        title: "New Announcement",
        body: payload.title,
        link: "/home",
      });
      return { created: true, notified };
    },
    onSuccess: (res) => {
      toast.success(
        res.created ? `Announcement published — ${res.notified} students notified.` : "Announcement updated.",
      );
      setOpen(false);
      setEditing(null);
      setForm({ ...EMPTY });
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const togglePin = useMutation({
    mutationFn: async (row: Announcement) => {
      const { error } = await supabase
        .from("announcements")
        .update({ pinned: !row.pinned })
        .eq("id", row.id);
      if (error) throw error;
      await audit(row.pinned ? "announcement.unpinned" : "announcement.pinned", "announcements", row.id, row.title);
    },
    onSuccess: () => {
      toast.success("Pin updated.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("announcement_reactions").delete().eq("announcement_id", id);
      const { error } = await supabase.from("announcements").delete().eq("id", id);
      if (error) throw error;
      await audit("announcement.deleted", "announcements", id);
    },
    onSuccess: () => {
      toast.success("Announcement deleted.");
      setDeleteId(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const startCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY });
    setOpen(true);
  };

  const startEdit = (row: Announcement) => {
    setEditing(row);
    setForm({
      title: row.title,
      message: row.message,
      company: row.company ?? "",
      drive_type: row.drive_type ?? "",
      target_course: row.target_course ?? "",
      pinned: row.pinned,
      publish_at: row.publish_at.slice(0, 16),
      expires_at: row.expires_at ? row.expires_at.slice(0, 16) : "",
    });
    setOpen(true);
  };

  return (
    <AdminShell
      title="Announcements"
      subtitle="Student news feed"
      actions={
        <Button size="sm" onClick={startCreate}>
          <Plus className="size-4" /> New
        </Button>
      }
    >
      {isLoading || !data ? (
        <Skeleton className="h-64 w-full rounded-2xl" />
      ) : data.rows.length === 0 ? (
        <p className="card-soft px-4 py-10 text-center text-sm text-muted-foreground">
          No announcements yet. Create the first one for the student feed.
        </p>
      ) : (
        <div className="space-y-3">
          {data.rows.map((row) => {
            const counts = data.counts[row.id] ?? {};
            const scheduled = new Date(row.publish_at).getTime() > Date.now();
            return (
              <article key={row.id} className="card-soft p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-bold">{row.title}</h2>
                      {row.pinned && (
                        <span className="rounded-full bg-primary/12 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          Pinned
                        </span>
                      )}
                      {scheduled && (
                        <span className="rounded-full bg-warning/18 px-2 py-0.5 text-[10px] font-semibold text-warning-foreground">
                          Scheduled
                        </span>
                      )}
                    </div>
                    <p className="mt-1 whitespace-pre-line text-xs text-muted-foreground">{row.message}</p>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {row.company ? `${row.company} · ` : ""}
                      {row.drive_type ? `${row.drive_type} · ` : ""}
                      {row.target_course ? `${row.target_course} · ` : "All courses · "}
                      {scheduled ? `Publishes ${shortDate(row.publish_at)}` : timeAgo(row.publish_at)}
                      {row.expires_at ? ` · Expires ${shortDate(row.expires_at)}` : ""}
                    </p>
                    <p className="mt-2 text-xs">
                      {Object.keys(counts).length === 0 ? (
                        <span className="text-muted-foreground">No reactions yet</span>
                      ) : (
                        Object.entries(counts).map(([emoji, n]) => (
                          <span key={emoji} className="mr-2">
                            {emoji} {n}
                          </span>
                        ))
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <Button variant="secondary" size="sm" onClick={() => togglePin.mutate(row)}>
                      {row.pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => startEdit(row)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setDeleteId(row.id)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit announcement" : "New announcement"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="a-title">Title</Label>
              <Input
                id="a-title"
                maxLength={120}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="a-msg">Message</Label>
              <Textarea
                id="a-msg"
                rows={4}
                maxLength={2000}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="a-company">Company (optional)</Label>
                <Input
                  id="a-company"
                  maxLength={80}
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="a-type">Drive type (optional)</Label>
                <Input
                  id="a-type"
                  maxLength={60}
                  value={form.drive_type}
                  onChange={(e) => setForm({ ...form, drive_type: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="a-course">Target course</Label>
                <select
                  id="a-course"
                  className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={form.target_course}
                  onChange={(e) => setForm({ ...form, target_course: e.target.value })}
                >
                  <option value="">All courses</option>
                  {COURSES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end gap-2">
                <input
                  id="a-pin"
                  type="checkbox"
                  className="size-4"
                  checked={form.pinned}
                  onChange={(e) => setForm({ ...form, pinned: e.target.checked })}
                />
                <Label htmlFor="a-pin">Pin to top</Label>
              </div>
              <div>
                <Label htmlFor="a-publish">Publish at</Label>
                <Input
                  id="a-publish"
                  type="datetime-local"
                  value={form.publish_at}
                  onChange={(e) => setForm({ ...form, publish_at: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="a-expires">Expires at (optional)</Label>
                <Input
                  id="a-expires"
                  type="datetime-local"
                  value={form.expires_at}
                  onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {editing ? "Save changes" : "Publish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this announcement?</AlertDialogTitle>
            <AlertDialogDescription>
              It will be removed from the student feed along with its reactions. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && remove.mutate(deleteId)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}
