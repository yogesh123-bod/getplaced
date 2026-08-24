import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ListChecks, Pencil, Plus, Trash2 } from "lucide-react";
import { AdminShell } from "@/components/placement/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { audit, COURSES, DIFFICULTIES, TEST_CATEGORIES } from "@/lib/admin-api";

export const Route = createFileRoute("/_authenticated/admin/tests/")({
  validateSearch: (s: Record<string, unknown>) => ({ new: s['new'] === "1" ? "1" : undefined }),
  head: () => ({
    meta: [
      { title: "Tests — Placement Cell" },
      { name: "description", content: "Create practice tests, manage question banks and publishing." },
      { property: "og:title", content: "Tests — Placement Cell" },
      { property: "og:description", content: "Create practice tests, manage question banks and publishing." },
    ],
  }),
  component: Page,
});

type Test = {
  id: string;
  name: string;
  category: string;
  course: string | null;
  difficulty: string;
  duration_min: number;
  description: string | null;
  total_marks: number;
  passing_marks: number;
  attempts_allowed: number;
  negative_marking: number;
  published: boolean;
  created_at: string;
};

type Question = {
  id: string;
  test_id: string;
  position: number;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  explanation: string | null;
  marks: number;
  negative_marks: number;
};

type Form = {
  name: string;
  category: string;
  course: string;
  difficulty: string;
  duration_min: string;
  description: string;
  total_marks: string;
  passing_marks: string;
  attempts_allowed: string;
  negative_marking: string;
  published: boolean;
};

const EMPTY: Form = {
  name: "",
  category: TEST_CATEGORIES[0],
  course: "",
  difficulty: "Medium",
  duration_min: "30",
  description: "",
  total_marks: "0",
  passing_marks: "0",
  attempts_allowed: "0",
  negative_marking: "0",
  published: false,
};

const EMPTY_Q = {
  question: "",
  option_a: "",
  option_b: "",
  option_c: "",
  option_d: "",
  correct_option: "A",
  explanation: "",
  marks: "1",
  negative_marks: "0",
};

function Page() {
  const initial = Route.useSearch();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [publishedFilter, setPublishedFilter] = useState("");
  const [formOpen, setFormOpen] = useState(initial.new === "1");
  const [editing, setEditing] = useState<Test | null>(null);
  const [form, setForm] = useState<Form>({ ...EMPTY });
  const [deleting, setDeleting] = useState<Test | null>(null);
  const [bank, setBank] = useState<Test | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-tests"],
    queryFn: async () => {
      const [tests, counts] = await Promise.all([
        supabase
          .from("tests")
          .select(
            "id, name, category, course, difficulty, duration_min, description, total_marks, passing_marks, attempts_allowed, negative_marking, published, created_at",
          )
          .order("created_at", { ascending: false })
          .limit(500),
        supabase.from("test_questions").select("test_id"),
      ]);
      if (tests.error) throw tests.error;
      const byTest: Record<string, number> = {};
      for (const row of counts.data ?? []) byTest[row.test_id] = (byTest[row.test_id] ?? 0) + 1;
      return { tests: (tests.data ?? []) as Test[], counts: byTest };
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-tests"] });

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY });
    setFormOpen(true);
  };
  const openEdit = (t: Test) => {
    setEditing(t);
    setForm({
      name: t.name,
      category: t.category,
      course: t.course ?? "",
      difficulty: t.difficulty,
      duration_min: String(t.duration_min),
      description: t.description ?? "",
      total_marks: String(t.total_marks ?? 0),
      passing_marks: String(t.passing_marks ?? 0),
      attempts_allowed: String(t.attempts_allowed ?? 0),
      negative_marking: String(t.negative_marking ?? 0),
      published: t.published,
    });
    setFormOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      const name = form.name.trim();
      if (!name) throw new Error("Test name is required.");
      const duration = Number(form.duration_min);
      if (!Number.isFinite(duration) || duration < 1 || duration > 600)
        throw new Error("Duration must be between 1 and 600 minutes.");
      const payload = {
        name,
        category: form.category,
        course: form.course.trim() || null,
        difficulty: form.difficulty,
        duration_min: Math.round(duration),
        description: form.description.trim() || null,
        total_marks: Math.max(0, Math.round(Number(form.total_marks) || 0)),
        passing_marks: Math.max(0, Math.round(Number(form.passing_marks) || 0)),
        attempts_allowed: Math.max(0, Math.round(Number(form.attempts_allowed) || 0)),
        negative_marking: Math.max(0, Number(form.negative_marking) || 0),
        published: form.published,
      };
      if (editing) {
        const { error } = await supabase.from("tests").update(payload).eq("id", editing.id);
        if (error) throw error;
        await audit("test.updated", "tests", editing.id, name);
      } else {
        const { error } = await supabase.from("tests").insert(payload);
        if (error) throw error;
        await audit("test.created", "tests", null, name);
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Test updated." : "Test created.");
      setFormOpen(false);
      setEditing(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const togglePublish = useMutation({
    mutationFn: async (t: Test) => {
      const { error } = await supabase.from("tests").update({ published: !t.published }).eq("id", t.id);
      if (error) throw error;
      await audit(t.published ? "test.unpublished" : "test.published", "tests", t.id, t.name);
      return !t.published;
    },
    onSuccess: (published) => {
      toast.success(published ? "Test published." : "Test unpublished.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (t: Test) => {
      const { error } = await supabase.from("tests").delete().eq("id", t.id);
      if (error)
        throw new Error(
          error.message.includes("foreign key")
            ? "Students have already attempted this test — unpublish it instead."
            : error.message,
        );
      await audit("test.deleted", "tests", t.id, t.name);
    },
    onSuccess: () => {
      toast.success("Test deleted.");
      setDeleting(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const term = search.trim().toLowerCase();
  const rows = (data?.tests ?? []).filter(
    (t) =>
      (!term || [t.name, t.category, t.course, t.difficulty].join(" ").toLowerCase().includes(term)) &&
      (!categoryFilter || t.category === categoryFilter) &&
      (!publishedFilter || String(t.published) === publishedFilter),
  );

  return (
    <AdminShell
      title="Tests"
      subtitle={`${rows.length} practice test${rows.length === 1 ? "" : "s"}`}
      actions={
        <div className="flex gap-1.5">
          <Button
            variant="secondary"
            size="sm"
            disabled={!rows.length}
            onClick={() =>
              downloadCsv(
                "tests.csv",
                rows.map((t) => ({
                  name: t.name,
                  category: t.category,
                  course: t.course ?? "",
                  difficulty: t.difficulty,
                  duration_min: t.duration_min,
                  questions: data?.counts[t.id] ?? 0,
                  published: t.published,
                })),
              )
            }
          >
            Export CSV
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1 h-4 w-4" /> New test
          </Button>
        </div>
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <Input
          value={search}
          maxLength={80}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tests..."
          className="max-w-sm"
          aria-label="Search tests"
        />
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {TEST_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={publishedFilter}
          onChange={(e) => setPublishedFilter(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="true">Published</option>
          <option value="false">Draft</option>
        </select>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-2xl" />
      ) : rows.length === 0 ? (
        <p className="card-soft px-4 py-10 text-center text-sm text-muted-foreground">
          No tests yet. Create your first practice test.
        </p>
      ) : (
        <div className="card-soft overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">Test</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Difficulty</th>
                <th className="px-4 py-3 font-semibold">Duration</th>
                <th className="px-4 py-3 font-semibold">Questions</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((t) => (
                <tr key={t.id} className="hover:bg-accent/30">
                  <td className="px-4 py-3">
                    <p className="font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.course ?? "All courses"}</p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">{t.category}</td>
                  <td className="px-4 py-3">{t.difficulty}</td>
                  <td className="whitespace-nowrap px-4 py-3">{t.duration_min} min</td>
                  <td className="px-4 py-3">{data?.counts[t.id] ?? 0}</td>
                  <td className="px-4 py-3">
                    <Badge variant={t.published ? "default" : "secondary"}>
                      {t.published ? "Published" : "Draft"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setBank(t)} title="Question bank">
                        <ListChecks className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => togglePublish.mutate(t)}
                        disabled={togglePublish.isPending}
                      >
                        {t.published ? "Unpublish" : "Publish"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(t)} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeleting(t)} title="Delete">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit test" : "New practice test"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="t-name">Test name</Label>
              <Input
                id="t-name"
                value={form.name}
                maxLength={120}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-cat">Category</Label>
              <select
                id="t-cat"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {TEST_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-diff">Difficulty</Label>
              <select
                id="t-diff"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.difficulty}
                onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-course">Course (optional)</Label>
              <select
                id="t-course"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.course}
                onChange={(e) => setForm({ ...form, course: e.target.value })}
              >
                <option value="">All courses</option>
                {COURSES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-dur">Duration (minutes)</Label>
              <Input
                id="t-dur"
                type="number"
                min={1}
                max={600}
                value={form.duration_min}
                onChange={(e) => setForm({ ...form, duration_min: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-total">Total marks</Label>
              <Input
                id="t-total"
                type="number"
                min={0}
                value={form.total_marks}
                onChange={(e) => setForm({ ...form, total_marks: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-pass">Passing marks</Label>
              <Input
                id="t-pass"
                type="number"
                min={0}
                value={form.passing_marks}
                onChange={(e) => setForm({ ...form, passing_marks: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-attempts">Attempts allowed (0 = unlimited)</Label>
              <Input
                id="t-attempts"
                type="number"
                min={0}
                value={form.attempts_allowed}
                onChange={(e) => setForm({ ...form, attempts_allowed: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-neg">Negative marking per wrong answer</Label>
              <Input
                id="t-neg"
                type="number"
                step="0.25"
                min={0}
                value={form.negative_marking}
                onChange={(e) => setForm({ ...form, negative_marking: e.target.value })}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="t-desc">Description</Label>
              <Textarea
                id="t-desc"
                rows={3}
                maxLength={800}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(e) => setForm({ ...form, published: e.target.checked })}
              />
              Published (visible to students)
            </label>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? "Saving..." : editing ? "Save changes" : "Create test"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {bank ? <QuestionBank test={bank} onClose={() => setBank(null)} onChanged={invalidate} /> : null}

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this test?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.name} and its questions will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleting && remove.mutate(deleting)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}

function QuestionBank({
  test,
  onClose,
  onChanged,
}: {
  test: Test;
  onClose: () => void;
  onChanged: () => void;
}) {
  const qc = useQueryClient();
  const [q, setQ] = useState({ ...EMPTY_Q });
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-test-questions", test.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("test_questions")
        .select("*")
        .eq("test_id", test.id)
        .order("position");
      if (error) throw error;
      return (data ?? []) as Question[];
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-test-questions", test.id] });
    onChanged();
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!q.question.trim()) throw new Error("Question text is required.");
      for (const [key, label] of [
        ["option_a", "Option A"],
        ["option_b", "Option B"],
        ["option_c", "Option C"],
        ["option_d", "Option D"],
      ] as const) {
        if (!q[key].trim()) throw new Error(`${label} is required.`);
      }
      const payload = {
        test_id: test.id,
        question: q.question.trim(),
        option_a: q.option_a.trim(),
        option_b: q.option_b.trim(),
        option_c: q.option_c.trim(),
        option_d: q.option_d.trim(),
        correct_option: q.correct_option,
        explanation: q.explanation.trim() || null,
        marks: Number(q.marks) || 1,
        negative_marks: Number(q.negative_marks) || 0,
      };
      if (editingId) {
        const { error } = await supabase.from("test_questions").update(payload).eq("id", editingId);
        if (error) throw error;
        await audit("question.updated", "test_questions", editingId, test.name);
      } else {
        const position = (data?.length ?? 0) + 1;
        const { error } = await supabase.from("test_questions").insert({ ...payload, position });
        if (error) throw error;
        await audit("question.created", "test_questions", null, test.name);
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Question updated." : "Question added.");
      setQ({ ...EMPTY_Q });
      setEditingId(null);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("test_questions").delete().eq("id", id);
      if (error)
        throw new Error(
          error.message.includes("foreign key")
            ? "This question already has student answers recorded."
            : error.message,
        );
      await audit("question.deleted", "test_questions", id, test.name);
    },
    onSuccess: () => {
      toast.success("Question deleted.");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const opt = (key: "option_a" | "option_b" | "option_c" | "option_d", label: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={`q-${key}`}>{label}</Label>
      <Input id={`q-${key}`} value={q[key]} onChange={(e) => setQ({ ...q, [key]: e.target.value })} />
    </div>
  );

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Question bank — {test.name}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <Skeleton className="h-32 w-full rounded-xl" />
        ) : (
          <ol className="space-y-2">
            {(data ?? []).map((item, i) => (
              <li key={item.id} className="rounded-xl border border-border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">
                      {i + 1}. {item.question}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Correct: {item.correct_option} · {item.marks} mark(s)
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingId(item.id);
                        setQ({
                          question: item.question,
                          option_a: item.option_a,
                          option_b: item.option_b,
                          option_c: item.option_c,
                          option_d: item.option_d,
                          correct_option: item.correct_option,
                          explanation: item.explanation ?? "",
                          marks: String(item.marks),
                          negative_marks: String(item.negative_marks),
                        });
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove.mutate(item.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
            {!(data ?? []).length ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No questions yet.</p>
            ) : null}
          </ol>
        )}

        <div className="mt-2 space-y-3 rounded-xl border border-border p-3">
          <p className="text-sm font-semibold">{editingId ? "Edit question" : "Add question"}</p>
          <div className="space-y-1.5">
            <Label htmlFor="q-text">Question</Label>
            <Textarea
              id="q-text"
              rows={2}
              value={q.question}
              onChange={(e) => setQ({ ...q, question: e.target.value })}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {opt("option_a", "Option A")}
            {opt("option_b", "Option B")}
            {opt("option_c", "Option C")}
            {opt("option_d", "Option D")}
            <div className="space-y-1.5">
              <Label htmlFor="q-correct">Correct option</Label>
              <select
                id="q-correct"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={q.correct_option}
                onChange={(e) => setQ({ ...q, correct_option: e.target.value })}
              >
                {["A", "B", "C", "D"].map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="q-marks">Marks</Label>
              <Input
                id="q-marks"
                type="number"
                min={0}
                step="0.5"
                value={q.marks}
                onChange={(e) => setQ({ ...q, marks: e.target.value })}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="q-exp">Explanation (optional)</Label>
              <Textarea
                id="q-exp"
                rows={2}
                value={q.explanation}
                onChange={(e) => setQ({ ...q, explanation: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            {editingId ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setEditingId(null);
                  setQ({ ...EMPTY_Q });
                }}
              >
                Cancel edit
              </Button>
            ) : null}
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? "Saving..." : editingId ? "Save question" : "Add question"}
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
