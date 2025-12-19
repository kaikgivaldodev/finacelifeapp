/**
 * Página de Contas Fixas
 * Gerenciamento de despesas recorrentes mensais
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
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency, formatDueDay, formatRelativeDate, toYYYYMMDD } from "@/lib/formatters";
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
  Calendar,
  Loader2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { useFixedBills, CreateFixedBillData, FixedBill, UpdateFixedBillData } from "@/hooks/useFixedBills";
import { z } from "zod";
import { toast } from "sonner";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DatePicker } from "@/components/ui/date-picker";

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

// Schema de validação
const fixedBillSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  amount: z.number().positive("Valor deve ser maior que zero"),
  category: z.string().min(1, "Categoria é obrigatória"),
  due_day: z.number().min(1).max(31, "Dia deve ser entre 1 e 31"),
  start_date: z.string().min(1, "Data de início é obrigatória"),
  end_date: z.string().optional(),
  description: z.string().optional(),
  auto_generate: z.boolean().optional(),
}).refine(data => {
  if (data.end_date && data.start_date) {
    return new Date(data.end_date) >= new Date(data.start_date);
  }
  return true;
}, {
  message: "Data de término deve ser maior ou igual à data de início",
  path: ["end_date"],
});

export default function ContasFixas() {
  const { bills, isLoading, createBill, updateBill, markAsPaid, deleteBill, isCreating, isUpdating } = useFixedBills();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<FixedBill | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    amount: "",
    category: "",
    dueDay: "",
    startDate: toYYYYMMDD(new Date()),
    endDate: "",
    autoGenerate: true,
  });

  const isEditing = !!editingBill;
  
  // Preview text for the billing schedule
  const billingPreview = useMemo(() => {
    if (!formData.dueDay || !formData.startDate) return "";
    
    const startDate = parse(formData.startDate, "yyyy-MM-dd", new Date());
    const monthLabel = format(startDate, "MMMM 'de' yyyy", { locale: ptBR });
    const capitalizedMonth = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
    
    return `Vai cobrar todo dia ${formData.dueDay} de cada mês, começando em ${capitalizedMonth}`;
  }, [formData.dueDay, formData.startDate]);

  // Calculate summaries
  const totalMonthly = bills.reduce((sum, b) => sum + b.amount, 0);
  const pendingCount = bills.filter(b => b.currentMonthStatus === "pending").length;
  const paidCount = bills.filter(b => b.currentMonthStatus === "paid").length;
  const overdueCount = bills.filter(b => b.currentMonthStatus === "overdue").length;

  const hasData = bills.length > 0;

  const getStatusBadge = (status: string, dueDate: Date) => {
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

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      amount: "",
      category: "",
      dueDay: "",
      startDate: toYYYYMMDD(new Date()),
      endDate: "",
      autoGenerate: true,
    });
    setEditingBill(null);
  };

  const openEditDialog = (bill: FixedBill) => {
    setEditingBill(bill);
    setFormData({
      name: bill.name,
      description: bill.description || "",
      amount: bill.amount.toString(),
      category: bill.category,
      dueDay: bill.due_day.toString(),
      startDate: bill.start_date,
      endDate: bill.end_date || "",
      autoGenerate: bill.auto_generate,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    const amount = parseFloat(formData.amount);
    const dueDay = parseInt(formData.dueDay);
    
    const validation = fixedBillSchema.safeParse({
      name: formData.name,
      amount: isNaN(amount) ? 0 : amount,
      category: formData.category,
      due_day: isNaN(dueDay) ? 0 : dueDay,
      start_date: formData.startDate,
      end_date: formData.endDate || undefined,
      description: formData.description,
      auto_generate: formData.autoGenerate,
    });

    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    try {
      if (isEditing && editingBill) {
        const updateData: UpdateFixedBillData = {
          id: editingBill.id,
          name: formData.name,
          amount,
          category: formData.category,
          due_day: dueDay,
          description: formData.description || undefined,
          auto_generate: formData.autoGenerate,
        };
        await updateBill(updateData);
      } else {
        const data: CreateFixedBillData = {
          name: formData.name,
          amount,
          category: formData.category,
          due_day: dueDay,
          start_date: formData.startDate,
          end_date: formData.endDate || undefined,
          description: formData.description || undefined,
          auto_generate: formData.autoGenerate,
        };
        await createBill(data);
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleMarkAsPaid = async (instanceId: string | undefined) => {
    if (!instanceId) return;
    await markAsPaid(instanceId);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta conta fixa?")) {
      await deleteBill(id);
    }
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
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Conta Fixa
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="font-display">
                  {isEditing ? "Editar Conta Fixa" : "Nova Conta Fixa"}
                </DialogTitle>
                <DialogDescription>
                  {isEditing ? "Atualize os dados da conta fixa" : "Cadastre uma despesa que se repete todo mês"}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {/* Nome */}
                <div className="grid gap-2">
                  <Label htmlFor="name">Nome da conta *</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Aluguel, Conta de luz..."
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                {/* Descrição */}
                <div className="grid gap-2">
                  <Label htmlFor="description">Descrição (opcional)</Label>
                  <Input
                    id="description"
                    placeholder="Ex: Apartamento centro"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                {/* Valor e Dia de vencimento */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="amount">Valor (R$) *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="dueDay">Dia de vencimento *</Label>
                    <Select
                      value={formData.dueDay}
                      onValueChange={(v) => setFormData({ ...formData, dueDay: v })}
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

                {/* Categoria */}
                <div className="grid gap-2">
                  <Label htmlFor="category">Categoria *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(v) => setFormData({ ...formData, category: v })}
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

                {/* Data de início e término */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="startDate">Começa em *</Label>
                    <DatePicker
                      value={formData.startDate ? parse(formData.startDate, "yyyy-MM-dd", new Date()) : undefined}
                      onChange={(date) => {
                        if (date) {
                          setFormData({ ...formData, startDate: toYYYYMMDD(date) });
                        }
                      }}
                      placeholder="Selecione a data"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="endDate">Termina em (opcional)</Label>
                    <DatePicker
                      value={formData.endDate ? parse(formData.endDate, "yyyy-MM-dd", new Date()) : undefined}
                      onChange={(date) => {
                        if (date) {
                          setFormData({ ...formData, endDate: toYYYYMMDD(date) });
                        } else {
                          setFormData({ ...formData, endDate: "" });
                        }
                      }}
                      placeholder="Sem data final"
                    />
                  </div>
                </div>

                {/* Preview */}
                {billingPreview && (
                  <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                    💡 {billingPreview}
                  </div>
                )}

                {/* Auto-generate toggle */}
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
                    checked={formData.autoGenerate}
                    onCheckedChange={(checked) => setFormData({ ...formData, autoGenerate: checked })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit} disabled={isCreating || isUpdating}>
                  {(isCreating || isUpdating) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEditing ? "Atualizar" : "Salvar"}
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
                  {bills.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                        Nenhuma conta fixa cadastrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    bills.map((bill, index) => (
                      <TableRow 
                        key={bill.id}
                        className="animate-fade-in"
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
                          {formatDueDay(bill.due_day)}
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
                              {bill.currentMonthStatus !== "paid" && bill.instanceId && (
                                <>
                                  <DropdownMenuItem 
                                    className="text-success"
                                    onClick={() => handleMarkAsPaid(bill.instanceId)}
                                  >
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    Marcar como paga
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>
                              )}
                              <DropdownMenuItem onClick={() => openEditDialog(bill)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => handleDelete(bill.id)}
                              >
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
