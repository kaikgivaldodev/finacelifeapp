/**
 * Página de Fatura do Cartão de Crédito
 * Visualização detalhada de transações, filtros e ações
 */
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { 
  ArrowLeft,
  CreditCard,
  Search,
  Filter,
  MoreHorizontal,
  Pencil,
  Trash2,
  CheckCircle2,
  Loader2,
  Upload,
  Receipt,
  FileDown,
  Calendar,
  Tag,
  Plus
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useState, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useCreditCards } from "@/hooks/useCreditCards";
import { useCreditCardStatements, CreditCardTransaction, UpdateTransactionData, CreateTransactionData } from "@/hooks/useCreditCardStatements";
import { ImportDialog } from "@/components/credit-card/ImportDialog";
import { toast } from "sonner";
import { format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DatePicker } from "@/components/ui/date-picker";

const categories = [
  "Sem categoria",
  "Alimentação",
  "Transporte",
  "Moradia",
  "Saúde",
  "Educação",
  "Lazer",
  "Compras",
  "Assinaturas",
  "Outros",
];

export default function Fatura() {
  const { cardId } = useParams<{ cardId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const { cards, isLoading: isLoadingCards } = useCreditCards();
  const card = cards.find(c => c.id === cardId);
  
  // Get month from URL or default to current month
  const monthParam = searchParams.get('mes');
  const getDefaultMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  };
  const selectedMonth = monthParam || getDefaultMonth();
  
  const { 
    statements, 
    transactions, 
    isLoadingStatements, 
    isLoadingTransactions,
    importTransactions,
    isImporting,
    updateTransaction,
    isUpdatingTransaction,
    deleteTransaction,
    isDeletingTransaction,
    markStatementAsPaid,
    isMarkingPaid,
    getStatementByMonth,
    createTransaction,
    isCreatingTransaction,
  } = useCreditCardStatements(cardId);

  const statement = cardId ? getStatementByMonth(cardId, selectedMonth) : undefined;
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterImported, setFilterImported] = useState<"all" | "imported" | "manual">("all");
  const [sortBy, setSortBy] = useState<"date" | "amount">("date");
  
  // Edit dialog states
  const [editingTransaction, setEditingTransaction] = useState<CreditCardTransaction | null>(null);
  const [editFormData, setEditFormData] = useState({
    date: "",
    description: "",
    amount: "",
    category: "",
  });
  
  // Add dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addFormData, setAddFormData] = useState({
    date: "",
    description: "",
    amount: "",
    category: categories[0],
  });
  
  // Import dialog state
  const [showImportDialog, setShowImportDialog] = useState(false);

  // Generate last 12 months options
  const monthOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = subMonths(now, i);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
      const label = format(date, "MMMM 'de' yyyy", { locale: ptBR });
      options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    return options;
  }, []);
  
  // Filter transactions
  const filteredTransactions = useMemo(() => {
    if (!statement) return [];
    
    let filtered = transactions.filter(t => t.statement_id === statement.id);
    
    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(search)
      );
    }
    
    // Apply imported filter
    if (filterImported === "imported") {
      filtered = filtered.filter(t => t.import_id !== null);
    } else if (filterImported === "manual") {
      filtered = filtered.filter(t => t.import_id === null);
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      if (sortBy === "date") {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      return b.amount - a.amount;
    });
    
    return filtered;
  }, [transactions, statement, searchTerm, filterImported, sortBy]);
  
  // Calculate total from filtered transactions (always from statement for consistency)
  const statementTotal = statement?.total_amount || 0;
  
  const handleMonthChange = (month: string) => {
    setSearchParams({ mes: month });
  };
  
  const openEditDialog = (transaction: CreditCardTransaction) => {
    setEditingTransaction(transaction);
    setEditFormData({
      date: transaction.date,
      description: transaction.description,
      amount: transaction.amount.toString(),
      category: transaction.category,
    });
  };
  
  const openAddDialog = () => {
    const today = new Date();
    const todayStr = format(today, "yyyy-MM-dd");
    setAddFormData({
      date: todayStr,
      description: "",
      amount: "",
      category: categories[0],
    });
    setIsAddDialogOpen(true);
  };
  
  const handleEditSubmit = async () => {
    if (!editingTransaction) return;
    
    const amount = parseFloat(editFormData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Valor inválido");
      return;
    }
    
    const updateData: UpdateTransactionData = {
      id: editingTransaction.id,
      date: editFormData.date,
      description: editFormData.description,
      amount,
      category: editFormData.category,
    };
    
    await updateTransaction(updateData);
    setEditingTransaction(null);
  };
  
  const handleAddSubmit = async () => {
    if (!statement || !cardId) return;

    const amount = parseFloat(addFormData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Valor inválido");
      return;
    }

    const data: CreateTransactionData = {
      credit_card_id: cardId,
      statement_id: statement.id,
      date: addFormData.date,
      description: addFormData.description,
      amount,
      category: addFormData.category,
    };

    await createTransaction(data);
    setIsAddDialogOpen(false);
  };

  const handleDelete = async (transactionId: string) => {
    if (confirm("Tem certeza que deseja excluir esta transação?")) {
      await deleteTransaction(transactionId);
    }
  };
  
  const handleMarkAsPaid = async () => {
    if (!statement) return;
    await markStatementAsPaid(statement.id);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <Badge className="bg-success/10 text-success hover:bg-success/20 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Paga
          </Badge>
        );
      case "closed":
        return (
          <Badge className="bg-warning/10 text-warning hover:bg-warning/20 gap-1">
            Fechada
          </Badge>
        );
      default:
        return (
          <Badge className="bg-muted text-muted-foreground hover:bg-muted/80 gap-1">
            Aberta
          </Badge>
        );
    }
  };
  
  const getMonthLabel = (referenceMonth: string) => {
    const [year, month] = referenceMonth.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    const label = format(date, "MMMM 'de' yyyy", { locale: ptBR });
    return label.charAt(0).toUpperCase() + label.slice(1);
  };
  
  const isLoading = isLoadingCards || isLoadingStatements || isLoadingTransactions;
  
  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }
  
  if (!card) {
    return (
      <MainLayout>
        <EmptyState
          icon={CreditCard}
          title="Cartão não encontrado"
          description="O cartão que você está procurando não existe ou foi removido."
          actionLabel="Voltar aos cartões"
          onAction={() => navigate("/cartoes")}
        />
      </MainLayout>
    );
  }
  
  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <Button 
            variant="ghost" 
            className="w-fit gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/cartoes")}
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar aos cartões
          </Button>
          
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                <CreditCard className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold text-foreground">
                  {card.name}
                  {card.last_digits && <span className="text-muted-foreground"> •••• {card.last_digits}</span>}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Fatura de {getMonthLabel(selectedMonth)}
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline"
                onClick={() => setShowImportDialog(true)}
              >
                <Upload className="mr-2 h-4 w-4" />
                Importar Extrato
              </Button>
              {statement && statement.status !== "paid" && (
                <Button 
                  onClick={handleMarkAsPaid}
                  disabled={isMarkingPaid}
                >
                  {isMarkingPaid ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  )}
                  Marcar como paga
                </Button>
              )}
            </div>
          </div>
        </div>
        
        {/* Summary Card */}
        <div className="rounded-xl border border-primary/20 bg-gradient-card p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-gold shadow-glow">
                <Receipt className="h-7 w-7 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total da fatura</p>
                <p className="font-display text-3xl font-bold text-foreground">
                  {formatCurrency(statementTotal)}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              {statement && getStatusBadge(statement.status)}
              <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-4 py-2">
                <Receipt className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <span className="font-semibold text-foreground">{filteredTransactions.length}</span>
                  <span className="text-muted-foreground"> transações</span>
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {/* Month Selector */}
            <Select value={selectedMonth} onValueChange={handleMonthChange}>
              <SelectTrigger className="w-[200px]">
                <Calendar className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Selecione o mês" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Filter by type */}
            <Select value={filterImported} onValueChange={(v: "all" | "imported" | "manual") => setFilterImported(v)}>
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filtrar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="imported">Somente importadas</SelectItem>
                <SelectItem value="manual">Somente manuais</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Sort by */}
            <Select value={sortBy} onValueChange={(v: "date" | "amount") => setSortBy(v)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Mais recentes</SelectItem>
                <SelectItem value="amount">Maior valor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar transação..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {statement && (
              <Button
                variant="outline"
                className="whitespace-nowrap"
                onClick={openAddDialog}
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar transação
              </Button>
            )}
          </div>
        </div>

        {/* Transactions Table */}
        {!statement || filteredTransactions.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="Sem transações nesta fatura"
            description="Importe um extrato ou adicione transações manualmente para começar."
            actionLabel="Importar extrato"
            onAction={() => setShowImportDialog(true)}
            className="min-h-[300px]"
          />
        ) : (
          <div className="rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((transaction, index) => (
                  <TableRow 
                    key={transaction.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${index * 20}ms` }}
                  >
                    <TableCell className="text-muted-foreground">
                      {formatDate(transaction.date)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">
                          {transaction.description}
                        </span>
                        {transaction.import_id && (
                          <Badge variant="outline" className="text-xs">
                            <FileDown className="mr-1 h-3 w-3" />
                            Importado
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="gap-1">
                        <Tag className="h-3 w-3" />
                        {transaction.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-foreground">
                      {formatCurrency(transaction.amount)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(transaction)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => handleDelete(transaction.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        
        {/* Edit Transaction Dialog */}
        <Dialog open={!!editingTransaction} onOpenChange={(open) => !open && setEditingTransaction(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="font-display">Editar Transação</DialogTitle>
              <DialogDescription>
                Atualize os dados da transação
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={editFormData.date}
                  onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Descrição</Label>
                <Input
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Valor (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editFormData.amount}
                    onChange={(e) => setEditFormData({ ...editFormData, amount: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Categoria</Label>
                  <Select
                    value={editFormData.category}
                    onValueChange={(v) => setEditFormData({ ...editFormData, category: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingTransaction(null)}>
                Cancelar
              </Button>
              <Button onClick={handleEditSubmit} disabled={isUpdatingTransaction}>
                {isUpdatingTransaction && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Import Dialog */}
        {card && (
          <ImportDialog
            open={showImportDialog}
            onOpenChange={setShowImportDialog}
            cardId={card.id}
            cardName={card.name}
            closingDay={(card as any).closing_day}
            onImport={importTransactions}
            isImporting={isImporting}
          />
        )}
      </div>
    </MainLayout>
  );
}
