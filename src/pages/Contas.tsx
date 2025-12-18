import { useState, useEffect, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAccounts, Account } from "@/hooks/useAccounts";
import { useBankConnections } from "@/hooks/useBankConnections";
import { Plus, Pencil, Trash2, Landmark, Wallet, PiggyBank, TrendingUp, Search, RefreshCw, Link2, Unlink, CreditCard, Building2 } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const accountTypes = [
  { value: "checking", label: "Conta Corrente", icon: Landmark },
  { value: "savings", label: "Poupança", icon: PiggyBank },
  { value: "investment", label: "Investimento", icon: TrendingUp },
  { value: "wallet", label: "Carteira", icon: Wallet },
];

const bankAccountTypes: Record<string, { label: string; icon: typeof Landmark }> = {
  checking: { label: "Conta Corrente", icon: Landmark },
  savings: { label: "Poupança", icon: PiggyBank },
  investment: { label: "Investimento", icon: TrendingUp },
  credit: { label: "Cartão de Crédito", icon: CreditCard },
  wallet: { label: "Carteira", icon: Wallet },
  other: { label: "Outra", icon: Building2 },
};

export default function Contas() {
  const { accounts, isLoading, createAccount, updateAccount, deleteAccount, isCreating, isUpdating } = useAccounts();
  const { 
    connections, 
    accounts: bankAccounts, 
    isLoadingConnections, 
    isLoadingAccounts,
    createConnectToken,
    saveConnection,
    syncAccounts,
    deleteConnection,
    isCreatingToken,
    isSavingConnection,
    isSyncing,
    isDeleting,
  } = useBankConnections();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    type: "checking",
    initial_balance: "",
  });

  const filteredAccounts = accounts.filter(account =>
    account.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const resetForm = () => {
    setFormData({ name: "", type: "checking", initial_balance: "" });
    setEditingAccount(null);
  };

  const handleOpenDialog = (account?: Account) => {
    if (account) {
      setEditingAccount(account);
      setFormData({
        name: account.name,
        type: account.type,
        initial_balance: account.initial_balance.toString(),
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      name: formData.name.trim(),
      type: formData.type,
      initial_balance: parseFloat(formData.initial_balance) || 0,
    };

    try {
      if (editingAccount) {
        await updateAccount({ id: editingAccount.id, ...data });
      } else {
        await createAccount(data);
      }
      handleCloseDialog();
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAccount(id);
    } catch (error) {
      // Error handled in hook
    }
  };

  const getAccountIcon = (type: string) => {
    const accountType = accountTypes.find(t => t.value === type);
    const Icon = accountType?.icon || Landmark;
    return <Icon className="h-4 w-4" />;
  };

  const getAccountTypeLabel = (type: string) => {
    return accountTypes.find(t => t.value === type)?.label || type;
  };

  const getBankAccountIcon = (type: string) => {
    const info = bankAccountTypes[type] || bankAccountTypes.other;
    const Icon = info.icon;
    return <Icon className="h-4 w-4" />;
  };

  const getBankAccountTypeLabel = (type: string) => {
    return bankAccountTypes[type]?.label || type;
  };

  // Handle Pluggy Connect widget message
  const handlePluggyMessage = useCallback(async (event: MessageEvent) => {
    // Check if it's from Pluggy
    if (event.origin !== 'https://connect.pluggy.ai') return;
    
    const data = event.data;
    
    if (data.event === 'ITEM_CREATED' && data.itemId) {
      console.log('Pluggy Connect: Item created', data.itemId);
      setIsConnecting(true);
      try {
        await saveConnection(data.itemId);
      } finally {
        setIsConnecting(false);
      }
    }
  }, [saveConnection]);

  useEffect(() => {
    window.addEventListener('message', handlePluggyMessage);
    return () => window.removeEventListener('message', handlePluggyMessage);
  }, [handlePluggyMessage]);

  const handleConnectBank = async () => {
    try {
      setIsConnecting(true);
      const connectToken = await createConnectToken();
      
      // Open Pluggy Connect in a popup
      const pluggyConnectUrl = `https://connect.pluggy.ai?connect_token=${connectToken}`;
      
      const width = 450;
      const height = 700;
      const left = (window.innerWidth - width) / 2 + window.screenX;
      const top = (window.innerHeight - height) / 2 + window.screenY;
      
      window.open(
        pluggyConnectUrl,
        'PluggyConnect',
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
      );
    } catch (error) {
      console.error('Error connecting bank:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSyncAccounts = async (connectionId?: string) => {
    try {
      await syncAccounts(connectionId);
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    try {
      await deleteConnection(connectionId);
    } catch (error) {
      // Error handled in hook
    }
  };

  const formatLastSync = (dateString: string | null) => {
    if (!dateString) return "Nunca sincronizado";
    return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  // Calculate total balance from Open Finance accounts
  const totalOpenFinanceBalance = bankAccounts.reduce((sum, acc) => sum + acc.current_balance, 0);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Contas Bancárias</h1>
            <p className="text-muted-foreground mt-1">Gerencie suas contas bancárias e carteiras</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} className="gap-2">
                <Plus className="h-4 w-4" />
                Nova Conta Manual
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingAccount ? "Editar Conta" : "Nova Conta"}</DialogTitle>
                <DialogDescription>
                  {editingAccount 
                    ? "Atualize as informações da conta bancária" 
                    : "Adicione uma nova conta bancária ou carteira"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Conta</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Nubank, Itaú, Carteira"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo de Conta</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {accountTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <type.icon className="h-4 w-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="initial_balance">Saldo Inicial</Label>
                  <Input
                    id="initial_balance"
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={formData.initial_balance}
                    onChange={(e) => setFormData({ ...formData, initial_balance: e.target.value })}
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isCreating || isUpdating}>
                    {editingAccount ? "Salvar" : "Criar Conta"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Open Finance Section */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Link2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Open Finance</CardTitle>
                  <CardDescription>
                    Conecte seus bancos automaticamente
                  </CardDescription>
                </div>
              </div>
              <div className="flex gap-2">
                {connections.length > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleSyncAccounts()}
                    disabled={isSyncing}
                    className="gap-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    Atualizar Saldos
                  </Button>
                )}
                <Button 
                  size="sm" 
                  onClick={handleConnectBank}
                  disabled={isCreatingToken || isConnecting || isSavingConnection}
                  className="gap-2 bg-primary hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4" />
                  Conectar Banco
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingConnections || isLoadingAccounts ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : connections.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="font-medium text-foreground mb-1">Nenhum banco conectado</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Conecte seu banco para importar suas contas e saldos automaticamente
                </p>
                <Button 
                  onClick={handleConnectBank}
                  disabled={isCreatingToken || isConnecting || isSavingConnection}
                  className="gap-2 bg-primary hover:bg-primary/90"
                >
                  <Link2 className="h-4 w-4" />
                  Conectar Banco via Open Finance
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Summary */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm text-muted-foreground">Saldo Total (Open Finance)</p>
                    <p className="text-2xl font-bold text-foreground">{formatCurrency(totalOpenFinanceBalance)}</p>
                  </div>
                  <Badge variant="outline" className="text-primary border-primary/30">
                    {bankAccounts.length} conta(s)
                  </Badge>
                </div>

                {/* Connected Accounts */}
                <div className="space-y-3">
                  {bankAccounts.map((account) => {
                    const connection = connections.find(c => c.id === account.connection_id);
                    return (
                      <div 
                        key={account.id} 
                        className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            {getBankAccountIcon(account.type)}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{account.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {getBankAccountTypeLabel(account.type)}
                              {account.institution_name && ` • ${account.institution_name}`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${account.current_balance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {formatCurrency(account.current_balance)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Atualizado: {formatLastSync(account.last_refreshed_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Connections Management */}
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium text-muted-foreground mb-3">Conexões ativas</p>
                  <div className="space-y-2">
                    {connections.map((connection) => (
                      <div 
                        key={connection.id} 
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                      >
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={connection.status === 'active' ? 'default' : 'destructive'}
                            className="text-xs"
                          >
                            {connection.status === 'active' ? 'Ativo' : connection.status === 'error' ? 'Erro' : 'Desconectado'}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            Última sync: {formatLastSync(connection.last_sync_at)}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSyncAccounts(connection.id)}
                            disabled={isSyncing}
                          >
                            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                <Unlink className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Desconectar banco?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja desconectar este banco? As contas associadas serão removidas.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDisconnect(connection.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  disabled={isDeleting}
                                >
                                  Desconectar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Manual Accounts Section */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>Contas Manuais</CardTitle>
                <CardDescription>
                  {filteredAccounts.length} de {accounts.length} conta(s)
                </CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : accounts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma conta manual cadastrada</p>
                <p className="text-sm">Clique em "Nova Conta Manual" para adicionar</p>
              </div>
            ) : filteredAccounts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma conta encontrada</p>
                <p className="text-sm">Tente buscar por outro nome</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Saldo Inicial</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAccounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {getAccountIcon(account.type)}
                          {account.name}
                        </div>
                      </TableCell>
                      <TableCell>{getAccountTypeLabel(account.type)}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(account.initial_balance)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(account)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir conta?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir a conta "{account.name}"? 
                                  Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(account.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
