/**
 * Página de Lançamentos
 * Gerenciamento de receitas e despesas com formas de pagamento
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import { DatePicker } from "@/components/ui/date-picker";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { 
  Plus, 
  Search, 
  Filter, 
  TrendingUp, 
  TrendingDown,
  MoreHorizontal,
  Pencil,
  Trash2,
  Receipt,
  Loader2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useTransactions, CreateTransactionData } from "@/hooks/useTransactions";
import { useCreditCards } from "@/hooks/useCreditCards";
import { format } from "date-fns";
import { z } from "zod";
import { toast } from "sonner";

const categories = [
  "Todas",
  "Salário",
  "Extra",
  "Alimentação",
  "Transporte",
  "Lazer",
  "Moradia",
  "Saúde",
  "Contas da casa",
  "Assinaturas",
  "Mercado",
  "Restaurante",
  "Outros",
];

const paymentMethods = [
  { value: "Dinheiro", label: "Dinheiro" },
  { value: "PIX", label: "PIX" },
  { value: "Débito", label: "Débito" },
  { value: "Crédito", label: "Crédito" },
  { value: "Transferência", label: "Transferência" },
];

// Schema de validação com Zod
const transactionSchema = z.object({
  type: z.enum(["income", "expense"]),
  date: z.date({ required_error: "Data é obrigatória" }),
  amount: z.number().positive("Valor deve ser maior que zero"),
  category: z.string().min(1, "Categoria é obrigatória"),
  payment_method: z.string().min(1, "Forma de pagamento é obrigatória"),
  credit_card_id: z.string().optional().nullable(),
  description: z.string().optional(),
}).refine((data) => {
  // Se forma de pagamento é Crédito ou Débito, cartão é obrigatório
  if (["Crédito", "Débito"].includes(data.payment_method)) {
    return !!data.credit_card_id;
  }
  return true;
}, {
  message: "Selecione um cartão para pagamentos com Crédito ou Débito",
  path: ["credit_card_id"],
});

export default function Lancamentos() {
  const { transactions, isLoading, createTransaction, deleteTransaction, isCreating } = useTransactions();
  const { cards } = useCreditCards();
  
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("Todas");
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const [newTransaction, setNewTransaction] = useState({
    type: "expense" as "income" | "expense",
    date: new Date(),
    amount: "",
    category: "",
    description: "",
    payment_method: "",
    credit_card_id: "",
  });

  const filteredTransactions = transactions.filter((t) => {
    if (typeFilter !== "all" && t.type !== typeFilter) return false;
    if (categoryFilter !== "Todas" && t.category !== categoryFilter) return false;
    if (searchTerm && !t.description?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const totalIncome = filteredTransactions.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = filteredTransactions.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);

  const hasData = transactions.length > 0;
  const showCardSelect = ["Crédito", "Débito"].includes(newTransaction.payment_method);

  const resetForm = () => {
    setNewTransaction({
      type: "expense",
      date: new Date(),
      amount: "",
      category: "",
      description: "",
      payment_method: "",
      credit_card_id: "",
    });
  };

  const handleSubmit = async () => {
    const amount = parseFloat(newTransaction.amount);
    
    const validation = transactionSchema.safeParse({
      type: newTransaction.type,
      date: newTransaction.date,
      amount: isNaN(amount) ? 0 : amount,
      category: newTransaction.category,
      payment_method: newTransaction.payment_method,
      credit_card_id: newTransaction.credit_card_id || null,
      description: newTransaction.description,
    });

    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    const data: CreateTransactionData = {
      type: newTransaction.type,
      date: format(newTransaction.date, "yyyy-MM-dd"),
      amount,
      category: newTransaction.category,
      payment_method: newTransaction.payment_method,
      credit_card_id: showCardSelect ? newTransaction.credit_card_id : null,
      description: newTransaction.description || undefined,
    };

    try {
      await createTransaction(data);
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este lançamento?")) {
      await deleteTransaction(id);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Lançamentos
            </h1>
            <p className="text-sm text-muted-foreground">
              Gerencie suas receitas e despesas
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Lançamento
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="font-display">Novo Lançamento</DialogTitle>
                <DialogDescription>
                  Adicione uma nova receita ou despesa
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {/* Tipo */}
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    type="button"
                    variant={newTransaction.type === "income" ? "success" : "outline"}
                    onClick={() => setNewTransaction({ ...newTransaction, type: "income" })}
                    className="w-full"
                  >
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Receita
                  </Button>
                  <Button
                    type="button"
                    variant={newTransaction.type === "expense" ? "danger" : "outline"}
                    onClick={() => setNewTransaction({ ...newTransaction, type: "expense" })}
                    className="w-full"
                  >
                    <TrendingDown className="mr-2 h-4 w-4" />
                    Despesa
                  </Button>
                </div>

                {/* Data - DatePicker padrão */}
                <div className="grid gap-2">
                  <Label>Data *</Label>
                  <DatePicker
                    value={newTransaction.date}
                    onChange={(date) => setNewTransaction({ ...newTransaction, date: date || new Date() })}
                  />
                </div>

                {/* Valor */}
                <div className="grid gap-2">
                  <Label htmlFor="amount">Valor (R$) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={newTransaction.amount}
                    onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                  />
                </div>

                {/* Categoria */}
                <div className="grid gap-2">
                  <Label>Categoria *</Label>
                  <Select
                    value={newTransaction.category}
                    onValueChange={(v) => setNewTransaction({ ...newTransaction, category: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.filter(c => c !== "Todas").map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Forma de Pagamento */}
                <div className="grid gap-2">
                  <Label>Forma de pagamento *</Label>
                  <Select
                    value={newTransaction.payment_method}
                    onValueChange={(v) => setNewTransaction({ 
                      ...newTransaction, 
                      payment_method: v,
                      credit_card_id: ["Crédito", "Débito"].includes(v) ? newTransaction.credit_card_id : ""
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map((method) => (
                        <SelectItem key={method.value} value={method.value}>
                          {method.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Cartão - aparece só se Crédito ou Débito */}
                {showCardSelect && (
                  <div className="grid gap-2">
                    <Label>Cartão *</Label>
                    <Select
                      value={newTransaction.credit_card_id}
                      onValueChange={(v) => setNewTransaction({ ...newTransaction, credit_card_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o cartão" />
                      </SelectTrigger>
                      <SelectContent>
                        {cards.length === 0 ? (
                          <SelectItem value="no_cards" disabled>
                            Nenhum cartão cadastrado
                          </SelectItem>
                        ) : (
                          cards.map((card) => (
                            <SelectItem key={card.id} value={card.id}>
                              {card.name} {card.last_digits && `•••• ${card.last_digits}`}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {cards.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        Cadastre um cartão em "Cartões de Crédito" primeiro
                      </p>
                    )}
                  </div>
                )}

                {/* Descrição */}
                <div className="grid gap-2">
                  <Label htmlFor="description">Descrição (opcional)</Label>
                  <Input
                    id="description"
                    placeholder="Ex: Compras do mês"
                    value={newTransaction.description}
                    onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit} disabled={isCreating}>
                  {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Loading */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !hasData ? (
          <EmptyState
            icon={Receipt}
            title="Nenhum lançamento cadastrado"
            description="Você ainda não tem receitas ou despesas registradas. Comece adicionando seu primeiro lançamento para acompanhar suas finanças."
            actionLabel="Criar lançamento"
            onAction={() => setIsDialogOpen(true)}
            className="min-h-[400px]"
          />
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-sm text-muted-foreground">Total de Receitas</p>
                <p className="mt-1 font-display text-xl font-bold text-success">
                  {formatCurrency(totalIncome)}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-sm text-muted-foreground">Total de Despesas</p>
                <p className="mt-1 font-display text-xl font-bold text-destructive">
                  {formatCurrency(totalExpenses)}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-sm text-muted-foreground">Saldo</p>
                <p className={cn(
                  "mt-1 font-display text-xl font-bold",
                  totalIncome - totalExpenses >= 0 ? "text-success" : "text-destructive"
                )}>
                  {formatCurrency(totalIncome - totalExpenses)}
                </p>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por descrição..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[140px]">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="income">Receitas</SelectItem>
                    <SelectItem value="expense">Despesas</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Table */}
            <div className="rounded-lg border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                        Nenhum lançamento encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransactions.map((transaction, index) => (
                      <TableRow 
                        key={transaction.id}
                        className="animate-fade-in"
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        <TableCell className="font-medium">
                          {formatDate(transaction.date)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={transaction.type === "income" ? "default" : "destructive"}
                            className={cn(
                              "gap-1",
                              transaction.type === "income" 
                                ? "bg-success/10 text-success hover:bg-success/20" 
                                : "bg-destructive/10 text-destructive hover:bg-destructive/20"
                            )}
                          >
                            {transaction.type === "income" ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : (
                              <TrendingDown className="h-3 w-3" />
                            )}
                            {transaction.type === "income" ? "Receita" : "Despesa"}
                          </Badge>
                        </TableCell>
                        <TableCell>{transaction.category}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {transaction.description || "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {transaction.payment_method}
                        </TableCell>
                        <TableCell className={cn(
                          "text-right font-semibold",
                          transaction.type === "income" ? "text-success" : "text-destructive"
                        )}>
                          {transaction.type === "income" ? "+" : "-"}{formatCurrency(transaction.amount)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(transaction.id)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
