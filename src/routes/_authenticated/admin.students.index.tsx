import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { KeyRound, Pencil, Plus, Upload } from "lucide-react";
import { AdminShell } from "@/components/placement/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/placement/StatusBadge";
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
import { downloadCsv } from "@/lib/format";
import { audit, COURSES, PLACEMENT_STATUSES } from "@/lib/admin-api";
import { adminCreateStudent, adminResetStudentPassword } from "@/lib/auth.functions";

export const Route = createFileRoute("/_authenticated/admin/students/")({
  head: () => ({
    meta: [
      { title: "Students — Placement Cell" },
      { name: "description", content: "Manage student records, academic data and placement status." },
      { property: "og:title", content: "Students — Placement Cell" },
      { property: "og:description", content: "Manage student records, academic data and placement status." },
    ],
  }),
  component: Page,
});

type Student = {
  user_id: string;
  student_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  course: string;
  branch: string;
  cgpa: number;
  backlog_count: number;
  graduation_year: number;
  placement_status: string;
  is_active: boolean;
};

const NEW_STUDENT = {
  student_id: "",
  full_name: "",
  email: "",
  phone: "",
  course: "BCA",
  branch: "BCA",
  cgpa: "0",
  backlog_count: "0",
  graduation_year: "2026",
};

function Page() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState("");
  const [status, setStatus] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ ...NEW_STUDENT });
  const [editing, setEditing] = useState<Student | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<Student | null>(null);
  const [resetTarget, setResetTarget] = useState<Student | null>(null);

  const createStudent = useServerFn(adminCreateStudent);
  const resetPassword = useServerFn(adminResetStudentPassword);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-students"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_profiles")
        .select(
          "user_id, student_id, full_name, email, phone, course, branch, cgpa, backlog_count, graduation_year, placement_status, is_active",
        )
        .order("student_id")
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as Student[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-students"] });

  const create = useMutation({
    mutationFn: async () => {
      const res = await createStudent({
        data: {
          student_id: createForm.student_id.trim(),
          full_name: createForm.full_name.trim(),
          email: createForm.email.trim(),
          phone: createForm.phone.trim() || undefined,
          course: createForm.course,
          branch: createForm.branch,
          cgpa: Number(createForm.cgpa),
          backlog_count: Number(createForm.backlog_count),
          graduation_year: Number(createForm.graduation_year),
        },
      });
      if (!res.ok) throw new Error(res.error);
      return res;
    },
    onSuccess: (res) => {
      toast.success(`Student account created. Temporary password: ${res.password}`, { duration: 12000 });
      setCreateOpen(false);
      setCreateForm({ ...NEW_STUDENT });
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveEdit = useMutation({
    mutationFn: async (row: Student) => {
      const { error } = await supabase
        .from("student_profiles")
        .update({
          full_name: row.full_name,
          phone: row.phone,
          course: row.course,
          branch: row.branch,
          cgpa: Number(row.cgpa),
          backlog_count: Number(row.backlog_count),
          graduation_year: Number(row.graduation_year),
          placement_status: row.placement_status,
        })
        .eq("user_id", row.user_id);
      if (error) throw error;
      await audit("student.updated", "student_profiles", row.student_id, row.full_name);
    },
    onSuccess: () => {
      toast.success("Student updated.");
      setEditing(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async (row: Student) => {
      const { error } = await supabase
        .from("student_profiles")
        .update({ is_active: !row.is_active })
        .eq("user_id", row.user_id);
      if (error) throw error;
      await audit(
        row.is_active ? "student.deactivated" : "student.reactivated",
        "student_profiles",
        row.student_id,
        row.full_name,
      );
    },
    onSuccess: () => {
      toast.success("Account status updated.");
      setConfirmToggle(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const doReset = useMutation({
    mutationFn: async (row: Student) => {
      const res = await resetPassword({ data: { userId: row.user_id } });
      if (!res.ok) throw new Error(res.error);
      return res;
    },
    onSuccess: (res) => {
      toast.success(`Temporary password: ${res.password}`, { duration: 12000 });
      setResetTarget(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const term = search.trim().toLowerCase();
  const rows = (data ?? []).filter(
    (r) =>
      (!term ||
        [r.student_id, r.full_name, r.email, r.branch, r.course]
          .join(" ")
          .toLowerCase()
          .includes(term)) &&
      (!branch || r.branch === branch) &&
      (!status || r.placement_status === status),
  );
  const branches = Array.from(new Set((data ?? []).map((r) => r.branch))).sort();

  return (
    <AdminShell
      title="Students"
      subtitle={`${rows.length} student${rows.length === 1 ? "" : "s"}`}
      actions={
        <div className="flex gap-1.5">
          <Button asChild variant="secondary" size="sm">
            <Link to="/admin/students/import">
              <Upload className="size-4" /> Import
            </Link>
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" /> Add
          </Button>
        </div>
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <Input
          value={search}
          maxLength={80}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, ID, email..."
          className="max-w-xs"
          aria-label="Search students"
        />
        <select
          aria-label="Filter by branch"
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
        >
          <option value="">All branches</option>
          {branches.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by placement status"
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          {PLACEMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <Button
          variant="secondary"
          size="sm"
          disabled={!rows.length}
          onClick={() =>
            downloadCsv(
              "students.csv",
              rows.map((r) => ({
                student_id: r.student_id,
                name: r.full_name,
                email: r.email,
                phone: r.phone ?? "",
                course: r.course,
                branch: r.branch,
                cgpa: r.cgpa,
                backlogs: r.backlog_count,
                batch: r.graduation_year,
                placement_status: r.placement_status,
                account: r.is_active ? "Active" : "Inactive",
              })),
            )
          }
        >
          Export CSV
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-2xl" />
      ) : rows.length === 0 ? (
        <p className="card-soft px-4 py-10 text-center text-sm text-muted-foreground">
          No students match these filters.
        </p>
      ) : (
        <div className="card-soft overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                {["Student ID", "Name", "Email", "Course", "Branch", "Batch", "CGPA", "Backlogs", "Placement", "Account", "Actions"].map(
                  (h) => (
                    <th key={h} className="whitespace-nowrap px-4 py-3 font-semibold">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.user_id} className="hover:bg-accent/30">
                  <td className="whitespace-nowrap px-4 py-3 font-semibold">
                    <Link to="/admin/students/$userId" params={{ userId: r.user_id }} className="hover:underline">
                      {r.student_id}
                    </Link>
                  </td>
                  <td className="max-w-[180px] truncate px-4 py-3">{r.full_name}</td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-muted-foreground">{r.email}</td>
                  <td className="px-4 py-3">{r.course}</td>
                  <td className="px-4 py-3">{r.branch}</td>
                  <td className="px-4 py-3">{r.graduation_year}</td>
                  <td className="px-4 py-3">{Number(r.cgpa).toFixed(2)}</td>
                  <td className="px-4 py-3">{r.backlog_count}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.placement_status === "Placed" ? "Selected" : r.placement_status} />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      className="text-xs font-semibold underline"
                      onClick={() => setConfirmToggle(r)}
                    >
                      {r.is_active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex gap-1.5">
                      <Button variant="secondary" size="sm" onClick={() => setEditing({ ...r })} aria-label="Edit student">
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => setResetTarget(r)} aria-label="Reset password">
                        <KeyRound className="size-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add student</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["student_id", "Student ID", "text"],
                ["full_name", "Full name", "text"],
                ["email", "Email", "email"],
                ["phone", "Phone", "text"],
                ["cgpa", "CGPA", "number"],
                ["backlog_count", "Backlogs", "number"],
                ["graduation_year", "Batch / graduation year", "number"],
                ["branch", "Branch", "text"],
              ] as const
            ).map(([key, label, type]) => (
              <div key={key}>
                <Label htmlFor={`c-${key}`}>{label}</Label>
                <Input
                  id={`c-${key}`}
                  type={type}
                  value={createForm[key]}
                  onChange={(e) => setCreateForm({ ...createForm, [key]: e.target.value })}
                />
              </div>
            ))}
            <div>
              <Label htmlFor="c-course">Course</Label>
              <select
                id="c-course"
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={createForm.course}
                onChange={(e) => setCreateForm({ ...createForm, course: e.target.value })}
              >
                {COURSES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            A secure temporary password is generated and the student must change it at first login.
          </p>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => create.mutate()} disabled={create.isPending}>
              Create account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit {editing?.student_id}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="e-name">Full name</Label>
                <Input
                  id="e-name"
                  value={editing.full_name}
                  onChange={(e) => setEditing({ ...editing, full_name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="e-phone">Phone</Label>
                <Input
                  id="e-phone"
                  value={editing.phone ?? ""}
                  onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="e-branch">Branch</Label>
                <Input
                  id="e-branch"
                  value={editing.branch}
                  onChange={(e) => setEditing({ ...editing, branch: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="e-course">Course</Label>
                <select
                  id="e-course"
                  className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={editing.course}
                  onChange={(e) => setEditing({ ...editing, course: e.target.value })}
                >
                  {COURSES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="e-cgpa">CGPA</Label>
                <Input
                  id="e-cgpa"
                  type="number"
                  step="0.01"
                  value={editing.cgpa}
                  onChange={(e) => setEditing({ ...editing, cgpa: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="e-backlogs">Backlogs</Label>
                <Input
                  id="e-backlogs"
                  type="number"
                  value={editing.backlog_count}
                  onChange={(e) => setEditing({ ...editing, backlog_count: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="e-batch">Batch</Label>
                <Input
                  id="e-batch"
                  type="number"
                  value={editing.graduation_year}
                  onChange={(e) => setEditing({ ...editing, graduation_year: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="e-status">Placement status</Label>
                <select
                  id="e-status"
                  className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={editing.placement_status}
                  onChange={(e) => setEditing({ ...editing, placement_status: e.target.value })}
                >
                  {PLACEMENT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={() => editing && saveEdit.mutate(editing)} disabled={saveEdit.isPending}>
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmToggle} onOpenChange={(o) => !o && setConfirmToggle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmToggle?.is_active ? "Deactivate" : "Reactivate"} {confirmToggle?.full_name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmToggle?.is_active
                ? "The student will no longer be able to sign in. Their records and history are preserved."
                : "The student will be able to sign in again."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmToggle && toggleActive.mutate(confirmToggle)}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!resetTarget} onOpenChange={(o) => !o && setResetTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset password for {resetTarget?.full_name}?</AlertDialogTitle>
            <AlertDialogDescription>
              A new temporary password is generated and the student must change it at next login.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => resetTarget && doReset.mutate(resetTarget)}>
              Reset password
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}
