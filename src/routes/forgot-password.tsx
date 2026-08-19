import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { studentForgotPassword } from "@/lib/auth.functions";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset your password — Campus Placement Portal" },
      {
        name: "description",
        content: "Request a password reset link for your campus placement portal student account.",
      },
      { property: "og:title", content: "Reset your password — Campus Placement Portal" },
      { property: "og:description", content: "Request a password reset link for your student account." },
    ],
  }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const [studentId, setStudentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await studentForgotPassword({
        data: { studentId, redirectTo: `${window.location.origin}/reset-password` },
      });
      setSent(true);
      toast.success("If the ID exists, a reset link has been emailed");
    } catch {
      toast.error("Could not send the reset link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm card-soft p-7">
        <h1 className="text-2xl font-bold">Forgot password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your College ID and we'll email a reset link to the address on file.
        </p>
        {sent ? (
          <div className="mt-6 flex items-start gap-3 rounded-2xl bg-success/10 p-4 text-sm">
            <MailCheck className="mt-0.5 size-5 text-success" />
            <p>Check your college email inbox for the password reset link.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="sid">Student / College ID</Label>
              <Input
                id="sid"
                value={studentId}
                maxLength={40}
                placeholder="22BCA1047"
                onChange={(e) => setStudentId(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || studentId.trim().length < 2}>
              {loading && <Loader2 className="size-4 animate-spin" />} Send reset link
            </Button>
          </form>
        )}
        <Link to="/login" className="mt-5 block text-center text-sm font-medium text-primary hover:underline">
          Back to login
        </Link>
      </div>
    </div>
  );
}
