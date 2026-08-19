import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [
      { title: "Placement Cell Admin Login — Campus Placements" },
      {
        name: "description",
        content:
          "Secure sign-in for the placement cell to manage students, drives, applications, announcements and practice tests.",
      },
      { property: "og:title", content: "Placement Cell Admin Login" },
      {
        property: "og:description",
        content: "Manage students, drives, applications and analytics from the admin console.",
      },
    ],
  }),
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error || !data.user) {
      toast.error("Invalid admin credentials");
      setLoading(false);
      return;
    }
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .eq("role", "admin");
    if (!roles?.length) {
      await supabase.auth.signOut();
      toast.error("This account does not have admin access");
      setLoading(false);
      return;
    }
    toast.success("Signed in to the admin console");
    navigate({ to: "/admin/dashboard", replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-sidebar px-5 py-12">
      <div className="w-full max-w-sm rounded-3xl bg-card p-7 shadow-float">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-primary">
          <ShieldCheck className="size-5 text-primary-foreground" />
        </div>
        <h1 className="mt-5 text-2xl font-bold">Placement Cell Login</h1>
        <p className="mt-1 text-sm text-muted-foreground">Admin access to the placement console.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Work email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              autoComplete="username"
              maxLength={255}
              placeholder="admin@college.edu.in"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              autoComplete="current-password"
              maxLength={128}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin" />} Sign in
          </Button>
        </form>
        <Link
          to="/login"
          className="mt-5 block text-center text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Student login instead
        </Link>
      </div>
    </div>
  );
}
