import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Card } from "@/components/ui/card";
import { Loader2, PieChart as PieChartIcon } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--destructive))",
  "hsl(var(--success))",
];

interface CategoryData {
  category: string;
  amount: number;
  percentage: number;
}

export function CategorySpendingChart() {
  const { user } = useAuth();
  const currentMonth = new Date();
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const { data: categoryData = [], isLoading } = useQuery({
    queryKey: ["category-spending", user?.id, format(monthStart, "yyyy-MM-dd")],
    queryFn: async () => {
      if (!user) return [];

      // Buscar transações do tipo expense do mês atual
      const { data: transactions, error } = await supabase
        .from("transactions")
        .select("category, amount")
        .eq("user_id", user.id)
        .eq("type", "expense")
        .gte("date", format(monthStart, "yyyy-MM-dd"))
        .lte("date", format(monthEnd, "yyyy-MM-dd"));

      if (error) throw error;

      // Agrupar por categoria e somar valores
      const categoryMap = new Map<string, number>();
      transactions.forEach((t) => {
        const current = categoryMap.get(t.category) || 0;
        categoryMap.set(t.category, current + t.amount);
      });

      // Calcular total para percentuais
      const total = Array.from(categoryMap.values()).reduce((sum, val) => sum + val, 0);

      // Converter para array e calcular percentuais
      const result: CategoryData[] = Array.from(categoryMap.entries())
        .map(([category, amount]) => ({
          category,
          amount,
          percentage: total > 0 ? (amount / total) * 100 : 0,
        }))
        .sort((a, b) => b.amount - a.amount);

      return result;
    },
    enabled: !!user,
  });

  const total = categoryData.reduce((sum, item) => sum + item.amount, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
          <p className="font-medium text-foreground">{data.category}</p>
          <p className="text-sm text-muted-foreground">{formatCurrency(data.amount)}</p>
          <p className="text-xs text-muted-foreground">{data.percentage.toFixed(1)}%</p>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = (props: any) => {
    const { payload } = props;
    return (
      <div className="flex flex-wrap gap-3 justify-center mt-4">
        {payload.map((entry: any, index: number) => (
          <div key={`legend-${index}`} className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-muted-foreground">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <PieChartIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-foreground">Gastos por Categoria</h3>
            <p className="text-sm text-muted-foreground">
              {format(currentMonth, "MMMM 'de' yyyy")}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  if (categoryData.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <PieChartIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-foreground">Gastos por Categoria</h3>
            <p className="text-sm text-muted-foreground">
              {format(currentMonth, "MMMM 'de' yyyy")}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <PieChartIcon className="h-12 w-12 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">
            Nenhum gasto registrado neste mês
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-gold shadow-glow">
            <PieChartIcon className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-foreground">Gastos por Categoria</h3>
            <p className="text-sm text-muted-foreground">
              {format(currentMonth, "MMMM 'de' yyyy")}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="font-display text-xl font-bold text-foreground">
            {formatCurrency(total)}
          </p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={categoryData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ percentage }) => `${percentage.toFixed(0)}%`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="amount"
            nameKey="category"
          >
            {categoryData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Lista detalhada */}
      <div className="mt-6 space-y-2">
        {categoryData.map((item, index) => (
          <div
            key={item.category}
            className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="text-sm font-medium text-foreground">{item.category}</span>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-foreground">
                {formatCurrency(item.amount)}
              </p>
              <p className="text-xs text-muted-foreground">{item.percentage.toFixed(1)}%</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}