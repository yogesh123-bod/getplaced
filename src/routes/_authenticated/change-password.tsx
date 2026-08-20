import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/change-password")({
  head: () => ({
    meta: [
      { title: "Change Password — Campus Placement Portal" },
      { name: "description", content: "Set a new password for your college placement portal account." },
      { property: "og:title", content: "Change Password — Campus Placement Portal" },
      { property: "og:description", content: "Set a new password for your placement portal account." },
    ],
  }),
  component: ChangePasswordPage,
});

function ChangePasswordPage() {
  const { session } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const mustChange = session.profile?.must_change_password;

  const submit = useMutation({
    mutationFn: async () => {
      if (password.length < 8) throw new Error("Use at least 8 characters");
      if (password !== confirm) throw new Error("Passwords do not match");
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      if (session.profile) {
        await supabase
          .from("student_profiles")
          .update({ must_change_password: false })
          .eq("user_id", session.userId!);
      }
    },
    onSuccess: () => {
      toast.success("Password changed successfully.");
      queryClient.invalidateQueries({ queryKey: ["session"] });
      navigate({ to: session.role === "admin" ? "/admin/dashboard" : "/home" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 px-4 py-10">
      <form
        className="card-soft w-full max-w-md space-y-4 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          submit.mutate();
        }}
      >
        <div className="flex size-11 items-center justify-center rounded-2xl gradient-brand text-primary-foreground">
          <KeyRound className="size-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Change password</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mustChange
              ? "For security, set your own password before continuing."
              : "Choose a strong password of at least 8 characters."}
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={password}
            maxLength={72}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm-password">Confirm password</Label>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            maxLength={72}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" disabled={submit.isPending}>
          {submit.isPending ? "Saving..." : "Update password"}
        </Button>
        {!mustChange && (
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => navigate({ to: session.role === "admin" ? "/admin/dashboard" : "/account" })}
          >
            Cancel
          </Button>
        )}
      </form>
    </div>
  );
}
