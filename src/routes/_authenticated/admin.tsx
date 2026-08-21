import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/**
 * Role gate for the whole /admin subtree. Students who type an admin URL are
 * bounced back to their own home. Data access is additionally enforced by RLS.
 */
export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/admin/login" });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id);
    if (!(roles ?? []).some((r) => r.role === "admin")) throw redirect({ to: "/home" });
  },
  component: () => <Outlet />,
});
