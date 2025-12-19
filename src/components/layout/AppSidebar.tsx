import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Receipt, 
  CreditCard, 
  Target, 
  BarChart3, 
  Settings,
  Wallet,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Calendar
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface SidebarItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}

const menuItems: SidebarItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "Lançamentos", icon: Receipt, href: "/lancamentos" },
  { label: "Contas Bancárias", icon: Wallet, href: "/contas" },
  { label: "Contas Fixas", icon: Receipt, href: "/contas-fixas" },
  { label: "Agenda Mensal", icon: Calendar, href: "/agenda-contas" },
  { label: "Cartões de Crédito", icon: CreditCard, href: "/cartoes" },
  { label: "Metas", icon: Target, href: "/metas" },
  { label: "Relatórios", icon: BarChart3, href: "/relatorios" },
];

const bottomItems: SidebarItem[] = [
  { label: "Configurações", icon: Settings, href: "/configuracoes" },
];

export function AppSidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string) => {
    if (href === "/") return location.pathname === "/";
    // Exact match OR starts with href + "/" (for subroutes)
    return location.pathname === href || location.pathname.startsWith(href + "/");
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r border-sidebar-border bg-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className={cn(
          "flex h-16 items-center border-b border-sidebar-border px-4",
          collapsed ? "justify-center" : "gap-3"
        )}>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-gold">
            <Wallet className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-display text-lg font-bold text-foreground">Vida</span>
              <span className="text-xs text-muted-foreground -mt-1">Financeira</span>
            </div>
          )}
        </div>

        {/* Main navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {menuItems.map((item) => (
              <li key={item.href}>
                <Link
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    collapsed && "justify-center px-0",
                    isActive(item.href)
                      ? "bg-sidebar-accent text-primary shadow-sm"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon className={cn("h-5 w-5 shrink-0", isActive(item.href) && "text-primary")} />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Bottom navigation */}
        <div className="border-t border-sidebar-border px-3 py-4">
          <ul className="space-y-1">
            {bottomItems.map((item) => (
              <li key={item.href}>
                <Link
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    collapsed && "justify-center px-0",
                    isActive(item.href)
                      ? "bg-sidebar-accent text-primary shadow-sm"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon className={cn("h-5 w-5 shrink-0", isActive(item.href) && "text-primary")} />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </li>
            ))}
            <li>
              <button
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 text-sidebar-foreground hover:bg-sidebar-accent hover:text-destructive",
                  collapsed && "justify-center px-0"
                )}
              >
                <LogOut className="h-5 w-5 shrink-0" />
                {!collapsed && <span>Sair</span>}
              </button>
            </li>
          </ul>
        </div>

        {/* Collapse button */}
        <div className="border-t border-sidebar-border p-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className={cn("w-full", collapsed ? "" : "justify-start px-3")}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span className="ml-2 text-xs">Recolher</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </aside>
  );
}
