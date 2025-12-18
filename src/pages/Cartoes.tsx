/**
 * Página de Cartões de Crédito
 * Gerenciamento de cartões, faturas e importação
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { 
  Plus, 
  CreditCard,
  Calendar,
  MoreHorizontal,
  Pencil,
  Trash2,
  AlertCircle,
  Loader2,
  Upload,
  FileText,
  ChevronRight,
  Receipt,
  Eye
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCreditCards, CreateCreditCardData, CreditCard as CreditCardType, UpdateCreditCardData } from "@/hooks/useCreditCards";
import { useCreditCardStatements } from "@/hooks/useCreditCardStatements";
import { ImportDialog } from "@/components/credit-card/ImportDialog";
import { z } from "zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Schema de validação
const cardSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  last_digits: z.string().max(4).optional(),
  limit_amount: z.number().positive("Limite deve ser maior que zero"),
  best_purchase_day: z.number().min(1).max(31).optional(),
  due_day: z.number().min(1).max(31, "Dia deve ser entre 1 e 31"),
  closing_day: z.number().min(1).max(31).optional(),
});

const cardColors = [
  "#8B5CF6", // Purple
  "#F59E0B", // Amber
  "#10B981", // Emerald
  "#EF4444", // Red
  "#3B82F6", // Blue
  "#EC4899", // Pink
];

export default function Cartoes() {
  const navigate = useNavigate();
  const { cards, isLoading, createCard, updateCard, deleteCard, isCreating, isUpdating } = useCreditCards();
  const { statements, transactions, isLoadingStatements, importTransactions, isImporting } = useCreditCardStatements();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [editingCard, setEditingCard] = useState<CreditCardType | null>(null);
  const [importCardId, setImportCardId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    lastDigits: "",
    limitAmount: "",
    bestPurchaseDay: "",
    dueDay: "",
    closingDay: "",
  });

  const isEditing = !!editingCard;
  const hasCards = cards.length > 0;

  // Get current month statement for a card
  const getCurrentStatement = (cardId: string) => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    return statements.find(
      s => s.credit_card_id === cardId && s.reference_month === currentMonth
    );
  };

  // Get transactions count for a card
  const getCardTransactionsCount = (cardId: string) => {
    return transactions.filter(t => t.credit_card_id === cardId).length;
  };

  // Assign colors and calculate used amount
  const cardsWithData = cards.map((card, index) => {
    const currentStatement = getCurrentStatement(card.id);
    return {
      ...card,
      color: cardColors[index % cardColors.length],
      usedAmount: currentStatement?.total_amount || 0,
      transactionsCount: getCardTransactionsCount(card.id),
    };
  });

  const getUsagePercentage = (used: number, limit: number) => limit > 0 ? (used / limit) * 100 : 0;
  
  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return "text-destructive";
    if (percentage >= 70) return "text-warning";
    return "text-success";
  };

  const resetForm = () => {
    setFormData({
      name: "",
      lastDigits: "",
      limitAmount: "",
      bestPurchaseDay: "",
      dueDay: "",
      closingDay: "",
    });
    setEditingCard(null);
  };

  const openEditDialog = (card: CreditCardType) => {
    setEditingCard(card);
    setFormData({
      name: card.name,
      lastDigits: card.last_digits || "",
      limitAmount: card.limit_amount.toString(),
      bestPurchaseDay: card.best_purchase_day?.toString() || "",
      dueDay: card.due_day.toString(),
      closingDay: (card as any).closing_day?.toString() || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    const limitAmount = parseFloat(formData.limitAmount);
    const dueDay = parseInt(formData.dueDay);
    const bestPurchaseDay = formData.bestPurchaseDay ? parseInt(formData.bestPurchaseDay) : undefined;
    const closingDay = formData.closingDay ? parseInt(formData.closingDay) : undefined;
    
    const validation = cardSchema.safeParse({
      name: formData.name,
      last_digits: formData.lastDigits,
      limit_amount: isNaN(limitAmount) ? 0 : limitAmount,
      best_purchase_day: bestPurchaseDay,
      due_day: isNaN(dueDay) ? 0 : dueDay,
      closing_day: closingDay,
    });

    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    try {
      if (isEditing && editingCard) {
        const updateData: UpdateCreditCardData = {
          id: editingCard.id,
          name: formData.name,
          last_digits: formData.lastDigits || undefined,
          limit_amount: limitAmount,
          best_purchase_day: bestPurchaseDay,
          due_day: dueDay,
        };
        await updateCard(updateData);
      } else {
        const data: CreateCreditCardData = {
          name: formData.name,
          last_digits: formData.lastDigits || undefined,
          limit_amount: limitAmount,
          best_purchase_day: bestPurchaseDay,
          due_day: dueDay,
        };
        await createCard(data);
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este cartão?")) {
      await deleteCard(id);
    }
  };

  const handleOpenImport = (cardId: string) => {
    setImportCardId(cardId);
  };

  const importingCard = cards.find(c => c.id === importCardId);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Cartões de Crédito
            </h1>
            <p className="text-sm text-muted-foreground">
              Gerencie seus cartões, faturas e importe extratos
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Cartão
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="font-display">
                  {isEditing ? "Editar Cartão" : "Novo Cartão"}
                </DialogTitle>
                <DialogDescription>
                  {isEditing ? "Atualize os dados do cartão" : "Cadastre um novo cartão de crédito"}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {/* Nome */}
                <div className="grid gap-2">
                  <Label>Nome do cartão *</Label>
                  <Input
                    placeholder="Ex: Nubank, Santander..."
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                {/* Últimos dígitos e Limite */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Últimos 4 dígitos</Label>
                    <Input
                      maxLength={4}
                      placeholder="0000"
                      value={formData.lastDigits}
                      onChange={(e) => setFormData({ ...formData, lastDigits: e.target.value.replace(/\D/g, "") })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Limite (R$) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={formData.limitAmount}
                      onChange={(e) => setFormData({ ...formData, limitAmount: e.target.value })}
                    />
                  </div>
                </div>

                {/* Fechamento e Vencimento */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Dia de fechamento</Label>
                    <Select
                      value={formData.closingDay}
                      onValueChange={(v) => setFormData({ ...formData, closingDay: v })}
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
                  <div className="grid gap-2">
                    <Label>Vencimento *</Label>
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

                {/* Melhor dia de compra */}
                <div className="grid gap-2">
                  <Label>Melhor dia de compra</Label>
                  <Select
                    value={formData.bestPurchaseDay}
                    onValueChange={(v) => setFormData({ ...formData, bestPurchaseDay: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o dia" />
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
        {isLoading || isLoadingStatements ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !hasCards ? (
          <EmptyState
            icon={CreditCard}
            title="Nenhum cartão de crédito cadastrado"
            description="Cadastre seus cartões para acompanhar suas faturas, limites e importar extratos."
            actionLabel="Cadastrar cartão"
            onAction={() => setIsDialogOpen(true)}
            className="min-h-[400px]"
          />
        ) : (
          <>
            {/* Cards Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cardsWithData.map((card, index) => {
                const usagePercentage = getUsagePercentage(card.usedAmount, card.limit_amount);
                const availableAmount = card.limit_amount - card.usedAmount;
                
                return (
                  <div
                    key={card.id}
                    className={cn(
                      "group relative rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:shadow-lg animate-fade-in",
                      selectedCard === card.id && "ring-2 ring-primary"
                    )}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    {/* Card Header */}
                    <div className="mb-4 flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-12 w-12 items-center justify-center rounded-lg"
                          style={{ backgroundColor: `${card.color}20` }}
                        >
                          <CreditCard className="h-6 w-6" style={{ color: card.color }} />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{card.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {card.last_digits ? `•••• ${card.last_digits}` : "••••"}
                          </p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handleOpenImport(card.id);
                          }}>
                            <Upload className="mr-2 h-4 w-4" />
                            Importar Extrato
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            openEditDialog(card);
                          }}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(card.id);
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Usage Info */}
                    <div className="mb-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Fatura atual</span>
                        <span className={cn("font-semibold", getUsageColor(usagePercentage))}>
                          {formatCurrency(card.usedAmount)}
                        </span>
                      </div>
                      <Progress 
                        value={usagePercentage} 
                        className={cn(
                          "h-2",
                          usagePercentage >= 90 && "[&>div]:bg-destructive",
                          usagePercentage >= 70 && usagePercentage < 90 && "[&>div]:bg-warning"
                        )}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Disponível: {formatCurrency(availableAmount)}</span>
                        <span>Limite: {formatCurrency(card.limit_amount)}</span>
                      </div>
                    </div>

                    {/* Transactions count */}
                    {card.transactionsCount > 0 && (
                      <div className="mb-3">
                        <button
                          onClick={() => navigate(`/cartoes/${card.id}/fatura?filter=imported`)}
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Receipt className="h-3 w-3" />
                          {card.transactionsCount} transações importadas
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      </div>
                    )}

                    {/* Card Footer */}
                    <div className="flex items-center justify-between border-t border-border pt-3">
                      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                        {(card as any).closing_day && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>Fecha dia: {(card as any).closing_day}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          <span>Vence dia: {card.due_day}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => handleOpenImport(card.id)}
                        >
                          <Upload className="mr-1 h-4 w-4" />
                          Importar
                        </Button>
                        <Button 
                          size="sm"
                          className="text-primary-foreground"
                          onClick={() => navigate(`/cartoes/${card.id}/fatura`)}
                        >
                          <Eye className="mr-1 h-4 w-4" />
                          Ver fatura
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Import hint */}
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Importar extratos</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Clique em "Importar" em qualquer cartão para carregar seu extrato em formato CSV ou OFX. 
                    Transações duplicadas serão ignoradas automaticamente.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Import Dialog */}
        {importingCard && (
          <ImportDialog
            open={!!importCardId}
            onOpenChange={(open) => {
              if (!open) setImportCardId(null);
            }}
            cardId={importCardId!}
            cardName={importingCard.name}
            closingDay={(importingCard as any).closing_day}
            onImport={importTransactions}
            isImporting={isImporting}
          />
        )}
      </div>
    </MainLayout>
  );
}
