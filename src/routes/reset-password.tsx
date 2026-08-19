import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Set a new password — Campus Placement Portal" },
      { name: "description", content: "Choose a new password for your campus placement portal account." },
      { property: "og:title", content: "Set a new password — Campus Placement Portal" },
      { property: "og:description", content: "Choose a new password for your placement portal account." },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      setReady(!!data.session || window.location.hash.includes("type=recovery"));
    };
    void check();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast.error("Use at least 8 characters");
    if (password !== confirm) return toast.error("Passwords do not match");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(error.message);
    await supabase.from("student_profiles").update({ must_change_password: false }).eq("user_id", (await supabase.auth.getUser()).data.user?.id ?? "");
    toast.success("Password updated. Please sign in.");
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm card-soft p-7">
        <h1 className="text-2xl font-bold">Set a new password</h1>
        {!ready && (
          <p className="mt-2 text-sm text-muted-foreground">
            Open this page from the reset link in your email.
          </p>
        )}
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="p1">New password</Label>
            <Input id="p1" type="password" value={password} maxLength={128} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p2">Confirm password</Label>
            <Input id="p2" type="password" value={confirm} maxLength={128} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin" />} Update password
          </Button>
        </form>
      </div>
    </div>
  );
}
