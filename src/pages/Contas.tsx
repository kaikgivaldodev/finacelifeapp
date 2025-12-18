import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAccounts, Account } from "@/hooks/useAccounts";
import { Plus, Pencil, Trash2, Landmark, Wallet, PiggyBank, TrendingUp, Search, Upload, FileSpreadsheet } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const accountTypes = [
  { value: "checking", label: "Conta Corrente", icon: Landmark },
  { value: "savings", label: "Poupança", icon: PiggyBank },
  { value: "investment", label: "Investimento", icon: TrendingUp },
  { value: "wallet", label: "Carteira", icon: Wallet },
];

export default function Contas() {
  const { accounts, isLoading, createAccount, updateAccount, deleteAccount, isCreating, isUpdating } = useAccounts();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
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

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.initial_balance, 0);

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
                Nova Conta
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

        {/* Import Section - Coming Soon */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Importar Extrato</CardTitle>
                  <CardDescription>
                    Conecte seus dados importando extratos bancários
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="font-medium text-foreground mb-1">Importação de Extratos</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Em breve você poderá importar seus extratos em formato CSV ou OFX
              </p>
              <Button disabled className="gap-2 bg-primary/50 cursor-not-allowed">
                <Upload className="h-4 w-4" />
                Importar Extrato (Em breve)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total de Contas</CardDescription>
              <CardTitle className="text-3xl">{accounts.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Saldo Total</CardDescription>
              <CardTitle className={`text-3xl ${totalBalance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {formatCurrency(totalBalance)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Tipo Mais Comum</CardDescription>
              <CardTitle className="text-xl">
                {accounts.length > 0 
                  ? getAccountTypeLabel(
                      Object.entries(
                        accounts.reduce((acc, account) => {
                          acc[account.type] = (acc[account.type] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>)
                      ).sort((a, b) => b[1] - a[1])[0]?.[0] || "checking"
                    )
                  : "-"
                }
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Accounts List */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle>Suas Contas</CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar conta..."
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
            ) : filteredAccounts.length === 0 ? (
              <div className="text-center py-8">
                <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="font-medium text-foreground mb-1">
                  {searchTerm ? "Nenhuma conta encontrada" : "Nenhuma conta cadastrada"}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {searchTerm 
                    ? "Tente outro termo de busca" 
                    : "Comece adicionando sua primeira conta bancária"}
                </p>
                {!searchTerm && (
                  <Button onClick={() => handleOpenDialog()} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Adicionar Conta
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Conta</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAccounts.map((account) => (
                      <TableRow key={account.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                              {getAccountIcon(account.type)}
                            </div>
                            <span className="font-medium">{account.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{getAccountTypeLabel(account.type)}</TableCell>
                        <TableCell className={`text-right font-medium ${account.initial_balance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          {formatCurrency(account.initial_balance)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(account)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
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
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
