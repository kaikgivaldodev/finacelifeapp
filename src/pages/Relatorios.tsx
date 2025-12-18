import { MainLayout } from "@/components/layout/MainLayout";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency } from "@/lib/formatters";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Calendar,
  BarChart3,
  Receipt
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

// Empty data - users start with nothing
const barData: any[] = [];
const pieData: any[] = [];

export default function Relatorios() {
  const [period, setPeriod] = useState("30");
  const navigate = useNavigate();

  const hasData = barData.length > 0 || pieData.length > 0;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Relatórios
            </h1>
            <p className="text-sm text-muted-foreground">
              Análise detalhada das suas finanças
            </p>
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="14">Últimos 14 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Empty State */}
        {!hasData ? (
          <EmptyState
            icon={BarChart3}
            title="Sem dados para relatórios"
            description="Comece adicionando lançamentos de receitas e despesas para visualizar relatórios detalhados e gráficos das suas finanças."
            actionLabel="Adicionar lançamento"
            onAction={() => navigate("/lancamentos")}
            className="min-h-[400px]"
          />
        ) : (
          <div className="text-center text-muted-foreground py-12">
            {/* Content when there is data - will be populated from database */}
            <p>Relatórios serão exibidos aqui quando houver dados</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
