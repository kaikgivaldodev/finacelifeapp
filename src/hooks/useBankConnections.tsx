/**
 * Hook para gerenciar conexões bancárias Open Finance (Pluggy)
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface BankConnection {
  id: string;
  user_id: string;
  provider: string;
  provider_item_id: string;
  status: string;
  last_sync_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface BankAccount {
  id: string;
  connection_id: string;
  provider_account_id: string;
  name: string;
  institution_name: string | null;
  type: string;
  currency: string;
  current_balance: number;
  available_balance: number | null;
  last_refreshed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BankAccountWithConnection extends BankAccount {
  bank_connection?: BankConnection;
}

export function useBankConnections() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch bank connections
  const connectionsQuery = useQuery({
    queryKey: ["bank_connections", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("bank_connections")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as BankConnection[];
    },
    enabled: !!user,
  });

  // Fetch bank accounts with connections
  const accountsQuery = useQuery({
    queryKey: ["bank_accounts", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // First get user's connections
      const { data: connections, error: connError } = await supabase
        .from("bank_connections")
        .select("id")
        .eq("user_id", user.id);
      
      if (connError) throw connError;
      if (!connections || connections.length === 0) return [];

      const connectionIds = connections.map(c => c.id);
      
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("*")
        .in("connection_id", connectionIds)
        .order("name", { ascending: true });
      
      if (error) throw error;
      return data as BankAccount[];
    },
    enabled: !!user,
  });

  // Create connect token
  const createConnectTokenMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('pluggy-create-connect-token');
      
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      return data.connectToken as string;
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar token de conexão: ${error.message}`);
    },
  });

  // Save connection after Pluggy Connect callback
  const saveConnectionMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { data, error } = await supabase.functions.invoke('pluggy-save-connection', {
        body: { itemId },
      });
      
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank_connections"] });
      queryClient.invalidateQueries({ queryKey: ["bank_accounts"] });
      toast.success("Banco conectado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao salvar conexão: ${error.message}`);
    },
  });

  // Sync accounts
  const syncMutation = useMutation({
    mutationFn: async (connectionId?: string) => {
      const { data, error } = await supabase.functions.invoke('pluggy-sync', {
        body: connectionId ? { connectionId } : {},
      });
      
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["bank_connections"] });
      queryClient.invalidateQueries({ queryKey: ["bank_accounts"] });
      if (data.synced > 0) {
        toast.success(`Saldos atualizados com sucesso!`);
      } else {
        toast.info("Nenhuma conexão para sincronizar");
      }
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar saldos: ${error.message}`);
    },
  });

  // Delete connection
  const deleteConnectionMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      const { error } = await supabase
        .from("bank_connections")
        .delete()
        .eq("id", connectionId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank_connections"] });
      queryClient.invalidateQueries({ queryKey: ["bank_accounts"] });
      toast.success("Conexão removida com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover conexão: ${error.message}`);
    },
  });

  return {
    connections: connectionsQuery.data ?? [],
    accounts: accountsQuery.data ?? [],
    isLoadingConnections: connectionsQuery.isLoading,
    isLoadingAccounts: accountsQuery.isLoading,
    createConnectToken: createConnectTokenMutation.mutateAsync,
    saveConnection: saveConnectionMutation.mutateAsync,
    syncAccounts: syncMutation.mutateAsync,
    deleteConnection: deleteConnectionMutation.mutateAsync,
    isCreatingToken: createConnectTokenMutation.isPending,
    isSavingConnection: saveConnectionMutation.isPending,
    isSyncing: syncMutation.isPending,
    isDeleting: deleteConnectionMutation.isPending,
  };
}
