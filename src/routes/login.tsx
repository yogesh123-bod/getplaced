import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { GraduationCap, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { seedDemoAccounts, studentLogin } from "@/lib/auth.functions";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Student Login — Campus Placement Portal" },
      {
        name: "description",
        content:
          "Sign in with your College ID to view placement drives, check eligibility, apply to companies and take practice tests.",
      },
      { property: "og:title", content: "Student Login — Campus Placement Portal" },
      {
        property: "og:description",
        content: "Access campus placement drives, eligibility checks, resume and practice tests.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId.trim() || password.length < 6) {
      toast.error("Enter your Student ID and password");
      return;
    }
    setLoading(true);
    try {
      const res = await studentLogin({ data: { studentId, password } });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const { error } = await supabase.auth.setSession({
        access_token: res.access_token,
        refresh_token: res.refresh_token,
      });
      if (error) {
        toast.error("Could not start your session. Please try again.");
        return;
      }
      toast.success(`Welcome back, ${res.name.split(" ")[0]}!`);
      navigate({ to: res.mustChangePassword ? "/change-password" : "/home", replace: true });
    } catch {
      toast.error("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await seedDemoAccounts({ data: undefined });
      setStudentId(res.student.studentId);
      setPassword(res.student.password);
      toast.success("Demo accounts ready — credentials filled in");
    } catch {
      toast.error("Could not prepare demo accounts");
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <div className="gradient-brand relative flex flex-col justify-between px-6 py-10 text-primary-foreground lg:w-1/2 lg:px-14 lg:py-16">
        <div className="flex items-center gap-2.5">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary-foreground/15">
            <GraduationCap className="size-5" />
          </div>
          <div className="leading-tight">
            <p className="font-bold">Campus Placements</p>
            <p className="text-xs opacity-75">ABC College, Pune</p>
          </div>
        </div>
        <div className="mt-10 max-w-md lg:mt-0">
          <h2 className="text-3xl font-bold leading-tight lg:text-4xl">
            Every drive, every deadline — in one place.
          </h2>
          <p className="mt-3 text-sm opacity-80">
            Discover eligible placement drives, apply in a tap, track your application status and
            sharpen your aptitude with practice tests.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-3 text-center">
            {[
              { k: "40+", v: "Recruiters" },
              { k: "1.2k", v: "Offers" },
              { k: "₹6.5L", v: "Top CTC" },
            ].map((s) => (
              <div key={s.v} className="rounded-2xl bg-primary-foreground/10 px-2 py-3">
                <p className="text-lg font-bold">{s.k}</p>
                <p className="text-[11px] opacity-75">{s.v}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-10 hidden text-xs opacity-60 lg:block">
          Accounts are provisioned by the Placement Cell. Self-registration is disabled.
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center px-5 py-10 lg:px-14">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold">Student Login</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Use the College ID issued by the Placement Cell.
          </p>

          <form onSubmit={handleLogin} className="mt-7 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="studentId">Student / College ID</Label>
              <Input
                id="studentId"
                value={studentId}
                autoComplete="username"
                placeholder="22BCA1047"
                maxLength={40}
                onChange={(e) => setStudentId(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                autoComplete="current-password"
                placeholder="••••••••"
                maxLength={128}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin" />} Sign in
            </Button>
          </form>

          <div className="mt-4 flex items-center justify-between text-sm">
            <Link to="/forgot-password" className="font-medium text-primary hover:underline">
              Forgot password?
            </Link>
            <Link
              to="/admin/login"
              className="inline-flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground"
            >
              <ShieldCheck className="size-4" /> Admin login
            </Link>
          </div>

          <div className="mt-8 rounded-2xl border border-dashed border-border p-4">
            <p className="text-xs font-semibold">Demo access</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Student <span className="font-mono">22BCA1047</span> /{" "}
              <span className="font-mono">Student@12345</span>
              <br />
              Admin <span className="font-mono">admin@college.edu.in</span> /{" "}
              <span className="font-mono">Admin@12345</span>
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-3 w-full"
              onClick={handleSeed}
              disabled={seeding}
            >
              {seeding && <Loader2 className="size-4 animate-spin" />} Prepare demo accounts
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
