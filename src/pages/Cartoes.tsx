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
import { formatCurrency, formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { 
  Plus, 
  CreditCard,
  Calendar,
  ShoppingCart,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  AlertCircle
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

interface CreditCardData {
  id: string;
  name: string;
  lastDigits: string;
  limitAmount: number;
  usedAmount: number;
  bestPurchaseDay: number;
  dueDay: number;
  color: string;
}

interface CardTransaction {
  id: string;
  cardId: string;
  date: Date;
  description: string;
  category: string;
  amount: number;
  installments: number;
  currentInstallment: number;
}

// Empty data - users start with nothing
const cards: CreditCardData[] = [];
const cardTransactions: CardTransaction[] = [];

export default function Cartoes() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [newCard, setNewCard] = useState({
    name: "",
    lastDigits: "",
    limitAmount: "",
    bestPurchaseDay: "",
    dueDay: "",
  });
  const [newTransaction, setNewTransaction] = useState({
    cardId: "",
    date: "",
    description: "",
    category: "",
    amount: "",
    installments: "1",
  });

  const hasCards = cards.length > 0;
  const hasTransactions = cardTransactions.length > 0;

  const getUsagePercentage = (used: number, limit: number) => (used / limit) * 100;
  
  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return "text-destructive";
    if (percentage >= 70) return "text-warning";
    return "text-success";
  };

  const currentCardTransactions = selectedCard 
    ? cardTransactions.filter(t => t.cardId === selectedCard)
    : cardTransactions;

  const currentBillTotal = selectedCard
    ? cardTransactions.filter(t => t.cardId === selectedCard).reduce((sum, t) => sum + t.amount, 0)
    : cardTransactions.reduce((sum, t) => sum + t.amount, 0);

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
          <div className="flex gap-2">
            {hasCards && (
              <Dialog open={isTransactionDialogOpen} onOpenChange={setIsTransactionDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Nova Compra
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle className="font-display">Nova Compra</DialogTitle>
                    <DialogDescription>
                      Registre uma compra no cartão de crédito
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label>Cartão</Label>
                      <Select
                        value={newTransaction.cardId}
                        onValueChange={(v) => setNewTransaction({ ...newTransaction, cardId: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o cartão" />
                        </SelectTrigger>
                        <SelectContent>
                          {cards.map((card) => (
                            <SelectItem key={card.id} value={card.id}>
                              {card.name} •••• {card.lastDigits}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Data</Label>
                        <Input
                          type="date"
                          value={newTransaction.date}
                          onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Valor (R$)</Label>
                        <Input
                          type="number"
                          placeholder="0,00"
                          value={newTransaction.amount}
                          onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label>Descrição</Label>
                      <Input
                        placeholder="Ex: Compra na Amazon"
                        value={newTransaction.description}
                        onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Categoria</Label>
                        <Select
                          value={newTransaction.category}
                          onValueChange={(v) => setNewTransaction({ ...newTransaction, category: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Alimentação">Alimentação</SelectItem>
                            <SelectItem value="Compras">Compras</SelectItem>
                            <SelectItem value="Transporte">Transporte</SelectItem>
                            <SelectItem value="Lazer">Lazer</SelectItem>
                            <SelectItem value="Outros">Outros</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>Parcelas</Label>
                        <Select
                          value={newTransaction.installments}
                          onValueChange={(v) => setNewTransaction({ ...newTransaction, installments: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                              <SelectItem key={n} value={n.toString()}>
                                {n}x
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsTransactionDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={() => setIsTransactionDialogOpen(false)}>
                      Salvar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Cartão
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle className="font-display">Novo Cartão</DialogTitle>
                  <DialogDescription>
                    Cadastre um novo cartão de crédito
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Nome do cartão</Label>
                    <Input
                      placeholder="Ex: Nubank, Santander..."
                      value={newCard.name}
                      onChange={(e) => setNewCard({ ...newCard, name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Últimos 4 dígitos</Label>
                      <Input
                        maxLength={4}
                        placeholder="0000"
                        value={newCard.lastDigits}
                        onChange={(e) => setNewCard({ ...newCard, lastDigits: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Limite (R$)</Label>
                      <Input
                        type="number"
                        placeholder="0,00"
                        value={newCard.limitAmount}
                        onChange={(e) => setNewCard({ ...newCard, limitAmount: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Melhor dia de compra</Label>
                      <Select
                        value={newCard.bestPurchaseDay}
                        onValueChange={(v) => setNewCard({ ...newCard, bestPurchaseDay: v })}
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
                      <Label>Vencimento</Label>
                      <Select
                        value={newCard.dueDay}
                        onValueChange={(v) => setNewCard({ ...newCard, dueDay: v })}
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
                  <Button onClick={() => setIsDialogOpen(false)}>
                    Salvar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Empty State */}
        {!hasCards ? (
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
              {cards.map((card, index) => {
                const usagePercentage = getUsagePercentage(card.usedAmount, card.limitAmount);
                const availableAmount = card.limitAmount - card.usedAmount;
                
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
                          <p className="text-sm text-muted-foreground">•••• {card.lastDigits}</p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver fatura
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive">
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
                        <span>Limite: {formatCurrency(card.limitAmount)}</span>
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>Melhor dia: {card.bestPurchaseDay}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        <span>Vence dia {card.dueDay}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Current Bill Section */}
            <div className="rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border p-4">
                <div>
                  <h3 className="font-display font-semibold text-foreground">
                    {selectedCard 
                      ? `Fatura - ${cards.find(c => c.id === selectedCard)?.name}`
                      : "Todas as compras"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Fatura atual: {formatCurrency(currentBillTotal)}
                  </p>
                </div>
                <Select defaultValue="current">
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current">Fatura atual</SelectItem>
                    <SelectItem value="next">Próxima fatura</SelectItem>
                    <SelectItem value="previous">Fatura anterior</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="divide-y divide-border">
                {currentCardTransactions.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    Nenhuma compra nesta fatura
                  </div>
                ) : (
                  currentCardTransactions.map((transaction, index) => (
                    <div 
                      key={transaction.id} 
                      className="flex items-center justify-between p-4 animate-fade-in"
                      style={{ animationDelay: `${index * 30}ms` }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                          <ShoppingCart className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{transaction.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(transaction.date)} · {transaction.category}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-foreground">{formatCurrency(transaction.amount)}</p>
                        {transaction.installments > 1 && (
                          <p className="text-xs text-muted-foreground">
                            {transaction.currentInstallment}/{transaction.installments}x
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
