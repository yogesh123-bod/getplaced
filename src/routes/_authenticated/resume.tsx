import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Download, FileText, Plus, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { StudentShell, PageHeader, NotificationBell } from "@/components/placement/StudentShell";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { initials } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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

export const Route = createFileRoute("/_authenticated/resume")({
  head: () => ({
    meta: [
      { title: "My Resume — Campus Placement Portal" },
      {
        name: "description",
        content: "Maintain your placement resume: summary, education, skills and resume file upload.",
      },
      { property: "og:title", content: "My Resume — Campus Placement Portal" },
      { property: "og:description", content: "Summary, education, skills and resume file for placements." },
    ],
  }),
  component: ResumePage,
});

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = [".pdf", ".doc", ".docx"];

function fileSize(bytes: number | null | undefined) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function ResumePage() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const profile = session.profile;
  const fileInput = useRef<HTMLInputElement>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [newSkill, setNewSkill] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["session"] });

  const saveProfile = useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      const { error } = await supabase
        .from("student_profiles")
        .update(patch)
        .eq("user_id", session.userId!);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;
      if (!ALLOWED.includes(ext)) throw new Error("Only PDF, DOC and DOCX files are accepted");
      if (file.size > MAX_BYTES) throw new Error("File must be smaller than 5 MB");
      const path = `${session.userId}/resume${ext}`;
      const { error } = await supabase.storage
        .from("resumes")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { error: updateError } = await supabase
        .from("student_profiles")
        .update({ resume_url: path, resume_name: file.name, resume_size: file.size })
        .eq("user_id", session.userId!);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      toast.success("Resume uploaded successfully.");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeResume = useMutation({
    mutationFn: async () => {
      if (profile?.resume_url) await supabase.storage.from("resumes").remove([profile.resume_url]);
      const { error } = await supabase
        .from("student_profiles")
        .update({ resume_url: null, resume_name: null, resume_size: null })
        .eq("user_id", session.userId!);
      if (error) throw error;
    },
    onSuccess: () => {
      setDeleteOpen(false);
      toast.success("Resume deleted.");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const download = async () => {
    if (!profile?.resume_url) return;
    const { data, error } = await supabase.storage
      .from("resumes")
      .createSignedUrl(profile.resume_url, 60);
    if (error || !data) return toast.error("Could not prepare download");
    window.open(data.signedUrl, "_blank", "noopener");
  };

  const addSkill = () => {
    const value = newSkill.trim().slice(0, 30);
    if (!value) return;
    const current = profile?.skills ?? [];
    if (current.some((s) => s.toLowerCase() === value.toLowerCase())) {
      toast.error("Skill already added");
      return;
    }
    saveProfile.mutate({ skills: [...current, value] });
    setNewSkill("");
  };

  return (
    <StudentShell>
      <PageHeader title="My Resume" subtitle="Used for placement applications" right={<NotificationBell />} />
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-4 lg:px-8">
        <section className="card-soft p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-14 items-center justify-center rounded-2xl gradient-brand text-base font-bold text-primary-foreground">
              {initials(profile?.full_name)}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold">{profile?.full_name}</h2>
              <p className="text-xs text-muted-foreground">
                {profile?.student_id} · {profile?.course}
              </p>
              <p className="truncate text-xs text-muted-foreground">{profile?.email}</p>
              <p className="text-xs text-muted-foreground">{profile?.phone}</p>
            </div>
          </div>
        </section>

        <section className="card-soft p-4">
          <h3 className="text-sm font-bold">Resume Summary</h3>
          <Textarea
            className="mt-2"
            rows={4}
            maxLength={600}
            placeholder="Write a short professional summary recruiters will read first..."
            value={summary ?? profile?.summary ?? ""}
            onChange={(e) => setSummary(e.target.value)}
          />
          <div className="mt-2 flex justify-end">
            <Button
              size="sm"
              disabled={summary === null || saveProfile.isPending}
              onClick={() => {
                saveProfile.mutate(
                  { summary: (summary ?? "").trim() },
                  { onSuccess: () => toast.success("Summary saved.") },
                );
                setSummary(null);
              }}
            >
              Save summary
            </Button>
          </div>
        </section>

        <section className="card-soft p-4">
          <h3 className="text-sm font-bold">Education</h3>
          <div className="mt-3 rounded-xl bg-secondary p-3 text-sm">
            <p className="font-semibold">{profile?.course}</p>
            <p className="text-muted-foreground">{profile?.college}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Graduating {profile?.graduation_year} · CGPA {Number(profile?.cgpa ?? 0).toFixed(2)}
            </p>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Academic data is maintained by the placement cell.
          </p>
        </section>

        <section className="card-soft p-4">
          <h3 className="text-sm font-bold">Skills</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {(profile?.skills ?? []).map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"
              >
                {skill}
                <button
                  type="button"
                  aria-label={`Remove ${skill}`}
                  onClick={() =>
                    saveProfile.mutate({
                      skills: (profile?.skills ?? []).filter((s) => s !== skill),
                    })
                  }
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
            {(profile?.skills ?? []).length === 0 && (
              <p className="text-xs text-muted-foreground">No skills added yet.</p>
            )}
          </div>
          <div className="mt-3 flex gap-2">
            <Input
              value={newSkill}
              maxLength={30}
              placeholder="Add a skill e.g. React"
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSkill();
                }
              }}
            />
            <Button variant="secondary" onClick={addSkill}>
              <Plus className="size-4" /> Add
            </Button>
          </div>
        </section>

        <section className="card-soft p-4">
          <h3 className="text-sm font-bold">Resume File</h3>
          <p className="mt-1 text-xs text-muted-foreground">Accepted formats: PDF, DOC, DOCX (max 5 MB)</p>
          {profile?.resume_name ? (
            <div className="mt-3 flex items-center gap-3 rounded-xl bg-secondary p-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FileText className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{profile.resume_name}</p>
                <p className="text-xs text-muted-foreground">{fileSize(profile.resume_size)}</p>
              </div>
              <Button variant="ghost" size="icon" aria-label="Download resume" onClick={download}>
                <Download className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Delete resume"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          ) : (
            <p className="mt-3 rounded-xl bg-secondary p-4 text-center text-xs text-muted-foreground">
              No resume uploaded yet.
            </p>
          )}
          <input
            ref={fileInput}
            type="file"
            accept=".pdf,.doc,.docx"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload.mutate(file);
              e.target.value = "";
            }}
          />
          <Button
            className="mt-3 w-full"
            onClick={() => fileInput.current?.click()}
            disabled={upload.isPending}
          >
            <Upload className="size-4" />
            {upload.isPending
              ? "Uploading..."
              : profile?.resume_name
                ? "Update Resume"
                : "Upload Resume"}
          </Button>
        </section>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete resume?</AlertDialogTitle>
            <AlertDialogDescription>
              Recruiters will no longer receive a resume with your applications until you upload a new one.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => removeResume.mutate()}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Label className="sr-only">Resume management</Label>
    </StudentShell>
  );
}
