import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useEtablissement() {
  return useQuery({
    queryKey: ["etablissement"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("etablissements")
        .select("*")
        .order("created_at")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useParametres(etablissementId?: string) {
  return useQuery({
    queryKey: ["parametres", etablissementId],
    enabled: !!etablissementId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parametres")
        .select("*")
        .eq("etablissement_id", etablissementId!);
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const p of data ?? []) map[p.cle] = p.valeur;
      return map;
    },
  });
}

export function useMonRole() {
  return useQuery({
    queryKey: ["mon-role"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return { roles: [] as string[], estAdmin: false, email: null as string | null };
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", uid);
      if (error) throw error;
      const roles = (data ?? []).map((r) => r.role as string);
      return { roles, estAdmin: roles.includes("admin"), email: userData.user?.email ?? null };
    },
  });
}
