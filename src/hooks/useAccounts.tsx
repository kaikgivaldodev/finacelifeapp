/**
 * Hook para gerenciar contas bancárias
 * CRUD completo com Supabase
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: string;
  initial_balance: number;
  created_at: string;
  updated_at: string;
}

export interface CreateAccountData {
  name: string;
  type?: string;
  initial_balance?: number;
}

export interface UpdateAccountData extends CreateAccountData {
  id: string;
}

export function useAccounts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["accounts", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .eq("user_id", user.id)
        .order("name", { ascending: true });
      
      if (error) throw error;
      return data as Account[];
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateAccountData) => {
      if (!user) throw new Error("Usuário não autenticado");
      
      const { data: result, error } = await supabase
        .from("accounts")
        .insert({
          user_id: user.id,
          name: data.name,
          type: data.type || "checking",
          initial_balance: data.initial_balance || 0,
        })
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Conta criada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar conta: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: UpdateAccountData) => {
      const { id, ...updateData } = data;
      const { data: result, error } = await supabase
        .from("accounts")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Conta atualizada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("accounts")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Conta excluída!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir: ${error.message}`);
    },
  });

  return {
    accounts: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createAccount: createMutation.mutateAsync,
    updateAccount: updateMutation.mutateAsync,
    deleteAccount: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  };
}
