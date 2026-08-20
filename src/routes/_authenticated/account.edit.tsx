import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { StudentShell, PageHeader } from "@/components/placement/StudentShell";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/account/edit")({
  head: () => ({
    meta: [
      { title: "Edit Profile — Campus Placement Portal" },
      {
        name: "description",
        content: "Update the contact details and summary the placement cell shares with recruiters.",
      },
      { property: "og:title", content: "Edit Profile — Campus Placement Portal" },
      { property: "og:description", content: "Update your contact details and professional summary." },
    ],
  }),
  component: EditProfilePage,
});

const schema = z.object({
  phone: z
    .string()
    .trim()
    .min(8, "Enter a valid phone number")
    .max(20, "Phone number is too long"),
  summary: z.string().trim().max(600, "Summary must be under 600 characters"),
});

function EditProfilePage() {
  const { session } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const p = session.profile;
  const [phone, setPhone] = useState(p?.phone ?? "");
  const [summary, setSummary] = useState(p?.summary ?? "");

  const save = useMutation({
    mutationFn: async () => {
      const parsed = schema.safeParse({ phone, summary });
      if (!parsed.success) throw new Error(parsed.error.issues[0]!.message);
      const { error } = await supabase
        .from("student_profiles")
        .update(parsed.data)
        .eq("user_id", session.userId!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile updated successfully.");
      queryClient.invalidateQueries({ queryKey: ["session"] });
      navigate({ to: "/account" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <StudentShell>
      <PageHeader
        title="Edit Profile"
        back={
          <button
            onClick={() => navigate({ to: "/account" })}
            aria-label="Back to account"
            className="flex size-9 items-center justify-center rounded-full bg-secondary hover:bg-accent"
          >
            <ArrowLeft className="size-4" />
          </button>
        }
      />
      <form
        className="mx-auto max-w-2xl space-y-4 px-4 py-4 lg:px-8"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <section className="card-soft space-y-4 p-4">
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={phone}
              maxLength={20}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="summary">Professional summary</Label>
            <Textarea
              id="summary"
              rows={5}
              maxLength={600}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
            />
          </div>
        </section>

        <section className="card-soft space-y-3 p-4">
          <h3 className="text-sm font-bold">Managed by placement cell</h3>
          {[
            ["Name", p?.full_name],
            ["Student ID", p?.student_id],
            ["Email", p?.email],
            ["Course / Branch", `${p?.course} · ${p?.branch}`],
            ["CGPA", Number(p?.cgpa ?? 0).toFixed(2)],
            ["Backlogs", String(p?.backlog_count ?? 0)],
            ["Graduation year", String(p?.graduation_year ?? "")],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">{label}</span>
              <span className="font-semibold">{value}</span>
            </div>
          ))}
          <p className="text-[11px] text-muted-foreground">
            Contact the placement cell to correct academic records.
          </p>
        </section>

        <Button type="submit" className="w-full" disabled={save.isPending}>
          {save.isPending ? "Saving..." : "Save changes"}
        </Button>
      </form>
    </StudentShell>
  );
}
