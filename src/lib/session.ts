import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type StudentProfile = Tables<"student_profiles">;

export type SessionInfo = {
  userId: string | null;
  email: string | null;
  role: "admin" | "student" | null;
  profile: StudentProfile | null;
};

export function sessionQueryOptions() {
  return {
    queryKey: ["session"],
    queryFn: async (): Promise<SessionInfo> => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) return { userId: null, email: null, role: null, profile: null };

      const [{ data: roles }, { data: profile }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("student_profiles").select("*").eq("user_id", user.id).maybeSingle(),
      ]);

      const role = (roles ?? []).some((r) => r.role === "admin")
        ? ("admin" as const)
        : (roles ?? []).some((r) => r.role === "student")
          ? ("student" as const)
          : null;

      return { userId: user.id, email: user.email ?? null, role, profile: profile ?? null };
    },
    staleTime: 30_000,
  };
}

export function useSession() {
  const query = useQuery(sessionQueryOptions());
  return {
    ...query,
    session: query.data ?? { userId: null, email: null, role: null, profile: null },
  };
}

export function useUnreadCount(userId: string | null) {
  return useQuery({
    queryKey: ["notifications", "unread", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId!)
        .eq("is_read", false);
      return count ?? 0;
    },
    refetchInterval: 60_000,
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
  };
}
