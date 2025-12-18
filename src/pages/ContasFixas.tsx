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
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency, formatDueDay, formatRelativeDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { 
  Plus, 
  Wallet,
  CheckCircle2,
  Clock,
  AlertCircle,
  MoreHorizontal,
  Pencil,
  Trash2,
  Power,
  Calendar
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

interface FixedBill {
  id: string;
  name: string;
  description?: string;
  amount: number;
  category: string;
  dueDay: number;
  isActive: boolean;
  currentMonthStatus: "pending" | "paid" | "overdue";
  currentMonthDueDate: Date;
}

// Empty data - users start with nothing
const fixedBills: FixedBill[] = [];

const categories = [
  "Moradia",
  "Contas da casa",
  "Transporte",
  "Assinaturas",
  "Saúde",
  "Educação",
  "Outros",
];

const getCategoryIcon = (category: string): string => {
  const icons: Record<string, string> = {
    "Moradia": "🏠",
    "Contas da casa": "💡",
    "Transporte": "🚗",
    "Assinaturas": "📺",
    "Saúde": "💊",
    "Educação": "📚",
    "Outros": "📋",
  };
  return icons[category] || "📋";
};

export default function ContasFixas() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newBill, setNewBill] = useState({
    name: "",
    description: "",
    amount: "",
    category: "",
    dueDay: "",
    autoGenerate: true,
  });

  // Calculate summaries
  const totalMonthly = fixedBills.filter(b => b.isActive).reduce((sum, b) => sum + b.amount, 0);
  const pendingCount = fixedBills.filter(b => b.currentMonthStatus === "pending").length;
  const paidCount = fixedBills.filter(b => b.currentMonthStatus === "paid").length;
  const overdueCount = fixedBills.filter(b => b.currentMonthStatus === "overdue").length;

  const hasData = fixedBills.length > 0;

  const getStatusBadge = (status: FixedBill["currentMonthStatus"], dueDate: Date) => {
    const relative = formatRelativeDate(dueDate);
    
    if (status === "paid") {
      return (
        <Badge className="bg-success/10 text-success hover:bg-success/20 gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Paga
        </Badge>
      );
    }

    if (status === "overdue") {
      return (
        <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/20 gap-1">
          <AlertCircle className="h-3 w-3" />
          {relative.text}
        </Badge>
      );
    }

    if (relative.status === "today") {
      return (
        <Badge className="bg-warning/10 text-warning hover:bg-warning/20 gap-1 animate-pulse">
          <Clock className="h-3 w-3" />
          Hoje
        </Badge>
      );
    }

    return (
      <Badge className="bg-muted text-muted-foreground hover:bg-muted/80 gap-1">
        <Calendar className="h-3 w-3" />
        {relative.text}
      </Badge>
    );
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Contas Fixas
            </h1>
            <p className="text-sm text-muted-foreground">
              Gerencie suas despesas recorrentes mensais
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Conta Fixa
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="font-display">Nova Conta Fixa</DialogTitle>
                <DialogDescription>
                  Cadastre uma despesa que se repete todo mês
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nome da conta *</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Aluguel, Conta de luz..."
                    value={newBill.name}
                    onChange={(e) => setNewBill({ ...newBill, name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Descrição (opcional)</Label>
                  <Input
                    id="description"
                    placeholder="Ex: Apartamento centro"
                    value={newBill.description}
                    onChange={(e) => setNewBill({ ...newBill, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="amount">Valor (R$) *</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="0,00"
                      value={newBill.amount}
                      onChange={(e) => setNewBill({ ...newBill, amount: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="dueDay">Dia de vencimento *</Label>
                    <Select
                      value={newBill.dueDay}
                      onValueChange={(v) => setNewBill({ ...newBill, dueDay: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Dia" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                          <SelectItem key={day} value={day.toString()}>
                            {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="category">Categoria *</Label>
                  <Select
                    value={newBill.category}
                    onValueChange={(v) => setNewBill({ ...newBill, category: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {getCategoryIcon(cat)} {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <Label htmlFor="auto-generate" className="text-sm font-medium">
                      Gerar automaticamente
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Cria a fatura todo mês automaticamente
                    </p>
                  </div>
                  <Switch
                    id="auto-generate"
                    checked={newBill.autoGenerate}
                    onCheckedChange={(checked) => setNewBill({ ...newBill, autoGenerate: checked })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={() => setIsDialogOpen(false)}>
                  Salvar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Empty State */}
        {!hasData ? (
          <EmptyState
            icon={Wallet}
            title="Nenhuma conta fixa cadastrada"
            description="Adicione aqui suas contas de água, luz, aluguel, internet, streaming e muito mais. Nunca mais esqueça um vencimento!"
            actionLabel="Nova conta fixa"
            onAction={() => setIsDialogOpen(true)}
            className="min-h-[400px]"
          />
        ) : (
          <>
            {/* Summary Card */}
            <div className="rounded-xl border border-primary/20 bg-gradient-card p-6">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-gold shadow-glow">
                    <Wallet className="h-7 w-7 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Custo mensal das contas fixas</p>
                    <p className="font-display text-3xl font-bold text-foreground">
                      {formatCurrency(totalMonthly)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-4 py-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      <span className="font-semibold text-foreground">{pendingCount}</span>
                      <span className="text-muted-foreground"> pendentes</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-success/10 px-4 py-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span className="text-sm">
                      <span className="font-semibold text-success">{paidCount}</span>
                      <span className="text-success/80"> pagas</span>
                    </span>
                  </div>
                  {overdueCount > 0 && (
                    <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-2 animate-pulse">
                      <AlertCircle className="h-4 w-4 text-destructive" />
                      <span className="text-sm">
                        <span className="font-semibold text-destructive">{overdueCount}</span>
                        <span className="text-destructive/80"> vencidas</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-border bg-card">
              <div className="border-b border-border p-4">
                <h3 className="font-display font-semibold text-foreground">Suas contas fixas</h3>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status do mês</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fixedBills.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                        Nenhuma conta fixa cadastrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    fixedBills.map((bill, index) => (
                      <TableRow 
                        key={bill.id}
                        className={cn(
                          "animate-fade-in",
                          !bill.isActive && "opacity-50"
                        )}
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-lg">
                              {getCategoryIcon(bill.category)}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{bill.name}</p>
                              {bill.description && (
                                <p className="text-xs text-muted-foreground">{bill.description}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{bill.category}</TableCell>
                        <TableCell className="font-semibold text-foreground">
                          {formatCurrency(bill.amount)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDueDay(bill.dueDay)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(bill.currentMonthStatus, bill.currentMonthDueDate)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {bill.currentMonthStatus !== "paid" && (
                                <>
                                  <DropdownMenuItem className="text-success">
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    Marcar como paga
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>
                              )}
                              <DropdownMenuItem>
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Power className="mr-2 h-4 w-4" />
                                {bill.isActive ? "Desativar" : "Ativar"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive">
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
