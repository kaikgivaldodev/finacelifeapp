import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  User, 
  Bell, 
  Shield, 
  Palette,
  Download,
  Trash2,
  LogOut
} from "lucide-react";
import { useState } from "react";

export default function Configuracoes() {
  const [notifications, setNotifications] = useState({
    billReminders: true,
    weeklyReport: false,
    goalAlerts: true,
  });

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Configurações
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerencie sua conta e preferências
          </p>
        </div>

        {/* Profile Section */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <User className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-semibold text-foreground">Perfil</h2>
          </div>
          
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" placeholder="Seu nome" defaultValue="João Silva" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="seu@email.com" defaultValue="joao@email.com" />
            </div>
          </div>
          
          <div className="mt-6 flex justify-end">
            <Button>Salvar alterações</Button>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-semibold text-foreground">Notificações</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <p className="font-medium text-foreground">Lembretes de contas</p>
                <p className="text-sm text-muted-foreground">
                  Receba alertas de contas próximas do vencimento
                </p>
              </div>
              <Switch
                checked={notifications.billReminders}
                onCheckedChange={(checked) => setNotifications({ ...notifications, billReminders: checked })}
              />
            </div>
            
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <p className="font-medium text-foreground">Relatório semanal</p>
                <p className="text-sm text-muted-foreground">
                  Receba um resumo das suas finanças toda semana
                </p>
              </div>
              <Switch
                checked={notifications.weeklyReport}
                onCheckedChange={(checked) => setNotifications({ ...notifications, weeklyReport: checked })}
              />
            </div>
            
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <p className="font-medium text-foreground">Alertas de metas</p>
                <p className="text-sm text-muted-foreground">
                  Seja notificado quando atingir ou ultrapassar metas
                </p>
              </div>
              <Switch
                checked={notifications.goalAlerts}
                onCheckedChange={(checked) => setNotifications({ ...notifications, goalAlerts: checked })}
              />
            </div>
          </div>
        </div>

        {/* Appearance Section */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <Palette className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-semibold text-foreground">Aparência</h2>
          </div>
          
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Moeda padrão</Label>
              <Select defaultValue="BRL">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRL">Real Brasileiro (R$)</SelectItem>
                  <SelectItem value="USD">Dólar Americano ($)</SelectItem>
                  <SelectItem value="EUR">Euro (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Formato de data</Label>
              <Select defaultValue="DD/MM/YYYY">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DD/MM/YYYY">DD/MM/AAAA</SelectItem>
                  <SelectItem value="MM/DD/YYYY">MM/DD/AAAA</SelectItem>
                  <SelectItem value="YYYY-MM-DD">AAAA-MM-DD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Data Section */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-semibold text-foreground">Dados e Privacidade</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <p className="font-medium text-foreground">Exportar dados</p>
                <p className="text-sm text-muted-foreground">
                  Baixe todos os seus dados em formato CSV
                </p>
              </div>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Exportar
              </Button>
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <div>
                <p className="font-medium text-destructive">Excluir conta</p>
                <p className="text-sm text-destructive/80">
                  Esta ação é irreversível e excluirá todos os seus dados
                </p>
              </div>
              <Button variant="danger" size="sm">
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </Button>
            </div>
          </div>
        </div>

        {/* Logout */}
        <div className="flex justify-center pb-6">
          <Button variant="outline" className="text-destructive hover:text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            Sair da conta
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
