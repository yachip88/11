import { Link, useLocation } from "wouter";
import {
  BarChart3,
  Activity,
  Table,
  TrendingUp,
  GitBranch,
  FileText,
  Brain,
  Upload,
  Flame,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigationItems = [
  { path: "/", label: "Дашборд", icon: BarChart3 },
  { path: "/control-charts", label: "Контрольные карты", icon: Activity },
  { path: "/ctp-table", label: "Таблица ЦТП", icon: Table },
  { path: "/trends", label: "Тренды", icon: TrendingUp },
  { path: "/tree", label: "Дерево подпитки", icon: GitBranch },
  { path: "/recommendations", label: "Рекомендации", icon: FileText },
  { path: "/analytics", label: "Аналитика", icon: Brain },
  { path: "/data-upload", label: "Загрузка данных", icon: Upload },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="sidebar fixed left-0 top-0 h-screen w-[280px] bg-sidebar border-r border-sidebar-border overflow-y-auto z-40">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <Flame className="w-6 h-6 text-sidebar-primary" />
          <div>
            <h1 className="text-lg font-bold leading-tight">НТСК Аналитика</h1>
            <p className="text-xs text-sidebar-foreground/70">
              Система подпитки
            </p>
          </div>
        </div>
      </div>

      <nav className="py-4">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;

          return (
            <Link key={item.path} href={item.path}>
              <div className={cn("nav-item", isActive && "active")}>
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border mt-auto">
        <div className="text-xs text-sidebar-foreground/70">
          <div className="flex justify-between mb-2">
            <span>Последнее обновление:</span>
            <span className="font-semibold">
              {new Date().toLocaleDateString("ru-RU", {
                day: "2-digit",
                month: "2-digit",
                year: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Статус системы:</span>
            <span className="inline-block px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400">
              Работает
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
