import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { AdminShell } from "@/components/placement/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
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
import { audit, COURSES, csvList } from "@/lib/admin-api";

export const Route = createFileRoute("/_authenticated/admin/companies")({
  validateSearch: (s: Record<string, unknown>) => ({ new: s['new'] === "1" ? "1" : undefined }),
  head: () => ({
    meta: [
      { title: "Companies — Placement Cell" },
      { name: "description", content: "Recruiting companies registered with the placement cell." },
      { property: "og:title", content: "Companies — Placement Cell" },
      { property: "og:description", content: "Recruiting companies registered with the placement cell." },
    ],
  }),
  component: Page,
});

type Company = {
  id: string;
  name: string;
  short_name: string | null;
  website: string | null;
  industry: string | null;
  description: string | null;
  email: string | null;
  phone: string | null;
  hr_name: string | null;
  hr_email: string | null;
  location: string | null;
  company_type: string | null;
  logo_url: string | null;
  logo_color: string;
  min_cgpa: number;
  eligible_courses: string[];
  is_active: boolean;
};

const COMPANY_TYPES = ["Product", "Service", "Startup", "MNC", "Government", "Other"] as const;
const LOGO_COLORS = ["#1e3a8a", "#0f766e", "#7c3aed", "#b45309", "#be123c", "#0369a1"] as const;

type Form = {
  name: string;
  short_name: string;
  industry: string;
  company_type: string;
  location: string;
  website: string;
  email: string;
  phone: string;
  hr_name: string;
  hr_email: string;
  logo_url: string;
  logo_color: string;
  min_cgpa: string;
  eligible_courses: string;
  description: string;
  is_active: boolean;
};

const EMPTY: Form = {
  name: "",
  short_name: "",
  industry: "",
  company_type: "Product",
  location: "",
  website: "",
  email: "",
  phone: "",
  hr_name: "",
  hr_email: "",
  logo_url: "",
  logo_color: LOGO_COLORS[0],
  min_cgpa: "0",
  eligible_courses: "",
  description: "",
  is_active: true,
};

function toForm(c: Company): Form {
  return {
    name: c.name,
    short_name: c.short_name ?? "",
    industry: c.industry ?? "",
    company_type: c.company_type ?? "Product",
    location: c.location ?? "",
    website: c.website ?? "",
    email: c.email ?? "",
    phone: c.phone ?? "",
    hr_name: c.hr_name ?? "",
    hr_email: c.hr_email ?? "",
    logo_url: c.logo_url ?? "",
    logo_color: c.logo_color,
    min_cgpa: String(c.min_cgpa ?? 0),
    eligible_courses: (c.eligible_courses ?? []).join(", "),
    description: c.description ?? "",
    is_active: c.is_active,
  };
}

function Page() {
  const search0 = Route.useSearch();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [industryFilter, setIndustryFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [formOpen, setFormOpen] = useState(search0.new === "1");
  const [editing, setEditing] = useState<Company | null>(null);
  const [form, setForm] = useState<Form>({ ...EMPTY });
  const [viewing, setViewing] = useState<Company | null>(null);
  const [deleting, setDeleting] = useState<Company | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select(
          "id, name, short_name, website, industry, description, email, phone, hr_name, hr_email, location, company_type, logo_url, logo_color, min_cgpa, eligible_courses, is_active",
        )
        .order("name")
        .limit(500);
      if (error) throw error;
      return (data ?? []) as Company[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-companies"] });

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY });
    setFormOpen(true);
  };
  const openEdit = (c: Company) => {
    setEditing(c);
    setForm(toForm(c));
    setFormOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      const name = form.name.trim();
      if (!name) throw new Error("Company name is required.");
      const cgpa = Number(form.min_cgpa);
      if (!Number.isFinite(cgpa) || cgpa < 0 || cgpa > 10) throw new Error("Minimum CGPA must be between 0 and 10.");
      const payload = {
        name,
        short_name: form.short_name.trim() || null,
        industry: form.industry.trim() || null,
        company_type: form.company_type,
        location: form.location.trim() || null,
        website: form.website.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        hr_name: form.hr_name.trim() || null,
        hr_email: form.hr_email.trim() || null,
        logo_url: form.logo_url.trim() || null,
        logo_color: form.logo_color,
        min_cgpa: cgpa,
        eligible_courses: csvList(form.eligible_courses),
        description: form.description.trim() || null,
        is_active: form.is_active,
      };
      if (editing) {
        const { error } = await supabase.from("companies").update(payload).eq("id", editing.id);
        if (error) throw error;
        await audit("company.updated", "companies", editing.id, name);
      } else {
        const { error } = await supabase.from("companies").insert(payload);
        if (error) throw error;
        await audit("company.created", "companies", null, name);
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Company updated." : "Company added.");
      setFormOpen(false);
      setEditing(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (c: Company) => {
      const { error } = await supabase.from("companies").delete().eq("id", c.id);
      if (error) throw new Error(error.message.includes("foreign key") ? "This company has placement drives — delete or reassign them first." : error.message);
      await audit("company.deleted", "companies", c.id, c.name);
    },
    onSuccess: () => {
      toast.success("Company deleted.");
      setDeleting(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const term = search.trim().toLowerCase();
  const rows = (data ?? []).filter(
    (r) =>
      (!term ||
        [r.name, r.short_name, r.industry, r.location, r.hr_name].join(" ").toLowerCase().includes(term)) &&
      (!industryFilter || r.industry === industryFilter) &&
      (!activeFilter || String(r.is_active) === activeFilter),
  );
  const industries = Array.from(new Set((data ?? []).map((r) => r.industry).filter(Boolean))) as string[];

  const field = (key: keyof Form, label: string, props: Record<string, unknown> = {}) => (
    <div className="space-y-1.5">
      <Label htmlFor={`c-${key}`}>{label}</Label>
      <Input
        id={`c-${key}`}
        value={String(form[key] ?? "")}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        {...props}
      />
    </div>
  );

  return (
    <AdminShell
      title="Companies"
      subtitle={`${rows.length} compan${rows.length === 1 ? "y" : "ies"}`}
      actions={
        <div className="flex gap-1.5">
          <Button
            variant="secondary"
            size="sm"
            disabled={!rows.length}
            onClick={() =>
              downloadCsv(
                "companies.csv",
                rows.map((r) => ({
                  name: r.name,
                  short_name: r.short_name ?? "",
                  industry: r.industry ?? "",
                  type: r.company_type ?? "",
                  location: r.location ?? "",
                  website: r.website ?? "",
                  email: r.email ?? "",
                  phone: r.phone ?? "",
                  hr_name: r.hr_name ?? "",
                  min_cgpa: r.min_cgpa,
                  status: r.is_active ? "Active" : "Inactive",
                })),
              )
            }
          >
            Export CSV
          </Button>
          <Button size="sm" onClick={openCreate}>
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
          placeholder="Search companies..."
          className="max-w-xs"
          aria-label="Search companies"
        />
        <select
          aria-label="Filter by industry"
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          value={industryFilter}
          onChange={(e) => setIndustryFilter(e.target.value)}
        >
          <option value="">All industries</option>
          {industries.map((i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by status"
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-2xl" />
      ) : rows.length === 0 ? (
        <p className="card-soft px-4 py-10 text-center text-sm text-muted-foreground">
          No companies match these filters.
        </p>
      ) : (
        <div className="card-soft overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                {["Company", "Industry", "Type", "Location", "HR contact", "Min CGPA", "Status", "Actions"].map((h) => (
                  <th key={h} className="whitespace-nowrap px-4 py-3 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-accent/30">
                  <td className="px-4 py-3">
                    <p className="font-semibold">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{r.website ?? r.short_name ?? "—"}</p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">{r.industry ?? "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3">{r.company_type ?? "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3">{r.location ?? "—"}</td>
                  <td className="px-4 py-3">
                    <p>{r.hr_name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{r.hr_email ?? r.email ?? ""}</p>
                  </td>
                  <td className="px-4 py-3">{Number(r.min_cgpa ?? 0).toFixed(1)}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span
                      className={
                        r.is_active
                          ? "rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary"
                          : "rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground"
                      }
                    >
                      {r.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" aria-label="View company" onClick={() => setViewing(r)}>
                        <Eye className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label="Edit company" onClick={() => openEdit(r)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label="Delete company" onClick={() => setDeleting(r)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={(o) => !o && setFormOpen(false)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit company" : "Add company"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            {field("name", "Company name *", { maxLength: 120 })}
            {field("short_name", "Short name", { maxLength: 20 })}
            {field("industry", "Industry", { maxLength: 60, placeholder: "IT Services" })}
            <div className="space-y-1.5">
              <Label htmlFor="c-type">Company type</Label>
              <select
                id="c-type"
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={form.company_type}
                onChange={(e) => setForm({ ...form, company_type: e.target.value })}
              >
                {COMPANY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            {field("location", "Location", { maxLength: 80 })}
            {field("website", "Website", { maxLength: 200, placeholder: "https://" })}
            {field("email", "Company email", { maxLength: 120, type: "email" })}
            {field("phone", "Phone", { maxLength: 20 })}
            {field("hr_name", "HR / recruiter name", { maxLength: 80 })}
            {field("hr_email", "HR email", { maxLength: 120, type: "email" })}
            {field("logo_url", "Logo image URL", { maxLength: 300 })}
            <div className="space-y-1.5">
              <Label htmlFor="c-color">Brand colour</Label>
              <select
                id="c-color"
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={form.logo_color}
                onChange={(e) => setForm({ ...form, logo_color: e.target.value })}
              >
                {LOGO_COLORS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            {field("min_cgpa", "Minimum CGPA", { type: "number", step: "0.1", min: 0, max: 10 })}
            {field("eligible_courses", "Eligible courses (comma separated)", {
              maxLength: 160,
              placeholder: COURSES.join(", "),
            })}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="c-desc">Description</Label>
              <Textarea
                id="c-desc"
                rows={3}
                maxLength={2000}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              />
              Active recruiter
            </label>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? "Saving..." : editing ? "Save changes" : "Add company"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewing?.name}</DialogTitle>
          </DialogHeader>
          {viewing && (
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              {[
                ["Industry", viewing.industry],
                ["Type", viewing.company_type],
                ["Location", viewing.location],
                ["Website", viewing.website],
                ["Email", viewing.email],
                ["Phone", viewing.phone],
                ["HR name", viewing.hr_name],
                ["HR email", viewing.hr_email],
                ["Min CGPA", String(viewing.min_cgpa ?? 0)],
                ["Eligible courses", (viewing.eligible_courses ?? []).join(", ")],
                ["Status", viewing.is_active ? "Active" : "Inactive"],
              ].map(([k, v]) => (
                <div key={k as string}>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">{k}</dt>
                  <dd className="break-words font-medium">{v || "—"}</dd>
                </div>
              ))}
              {viewing.description && (
                <div className="sm:col-span-2">
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Description</dt>
                  <dd>{viewing.description}</dd>
                </div>
              )}
            </dl>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the company from the recruiter directory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleting && remove.mutate(deleting)} disabled={remove.isPending}>
              {remove.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}
