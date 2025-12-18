/**
 * Página de Cartões de Crédito
 * Gerenciamento de cartões e faturas
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
  Loader2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";
import { useCreditCards, CreateCreditCardData, CreditCard as CreditCardType, UpdateCreditCardData } from "@/hooks/useCreditCards";
import { z } from "zod";
import { toast } from "sonner";

// Schema de validação
const cardSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  last_digits: z.string().max(4).optional(),
  limit_amount: z.number().positive("Limite deve ser maior que zero"),
  best_purchase_day: z.number().min(1).max(31).optional(),
  due_day: z.number().min(1).max(31, "Dia deve ser entre 1 e 31"),
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
  const { cards, isLoading, createCard, updateCard, deleteCard, isCreating, isUpdating } = useCreditCards();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [editingCard, setEditingCard] = useState<CreditCardType | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    lastDigits: "",
    limitAmount: "",
    bestPurchaseDay: "",
    dueDay: "",
  });

  const isEditing = !!editingCard;
  const hasCards = cards.length > 0;

  // Assign colors to cards
  const cardsWithColors = cards.map((card, index) => ({
    ...card,
    color: cardColors[index % cardColors.length],
    usedAmount: 0, // TODO: calcular do banco
  }));

  const getUsagePercentage = (used: number, limit: number) => (used / limit) * 100;
  
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
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    const limitAmount = parseFloat(formData.limitAmount);
    const dueDay = parseInt(formData.dueDay);
    const bestPurchaseDay = formData.bestPurchaseDay ? parseInt(formData.bestPurchaseDay) : undefined;
    
    const validation = cardSchema.safeParse({
      name: formData.name,
      last_digits: formData.lastDigits,
      limit_amount: isNaN(limitAmount) ? 0 : limitAmount,
      best_purchase_day: bestPurchaseDay,
      due_day: isNaN(dueDay) ? 0 : dueDay,
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
              Gerencie seus cartões e faturas
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

                {/* Melhor dia e Vencimento */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Melhor dia de compra</Label>
                    <Select
                      value={formData.bestPurchaseDay}
                      onValueChange={(v) => setFormData({ ...formData, bestPurchaseDay: v })}
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
        ) : !hasCards ? (
          <EmptyState
            icon={CreditCard}
            title="Nenhum cartão de crédito cadastrado"
            description="Cadastre seus cartões para acompanhar suas faturas, limites e melhores dias de compra."
            actionLabel="Cadastrar cartão"
            onAction={() => setIsDialogOpen(true)}
            className="min-h-[400px]"
          />
        ) : (
          <>
            {/* Cards Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cardsWithColors.map((card, index) => {
                const usagePercentage = getUsagePercentage(card.usedAmount, card.limit_amount);
                const availableAmount = card.limit_amount - card.usedAmount;
                
                return (
                  <div
                    key={card.id}
                    className={cn(
                      "group relative rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:shadow-lg cursor-pointer animate-fade-in",
                      selectedCard === card.id && "ring-2 ring-primary"
                    )}
                    style={{ animationDelay: `${index * 100}ms` }}
                    onClick={() => setSelectedCard(selectedCard === card.id ? null : card.id)}
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
                        <span className="text-muted-foreground">Utilizado</span>
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

                    {/* Card Footer */}
                    <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                      {card.best_purchase_day && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>Melhor dia: {card.best_purchase_day}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        <span>Vence dia: {card.due_day}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Info message */}
            <div className="rounded-lg border border-border bg-muted/50 p-4 text-center">
              <p className="text-sm text-muted-foreground">
                💡 Para registrar compras no cartão, vá em <strong>Lançamentos</strong> e selecione a forma de pagamento "Crédito" ou "Débito".
              </p>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
