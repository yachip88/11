import { useState } from "react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { 
  ChevronDown, 
  ChevronRight, 
  Building2, 
  MapPin, 
  Thermometer, 
  Search,
  Eye,
  Settings
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TreeNodeProps {
  id: string;
  icon: 'city' | 'building' | 'map' | 'thermometer';
  name: string;
  makeupWater: number;
  weeklyChange?: number;
  status: 'normal' | 'warning' | 'critical';
  actionType?: string;
  isRoot?: boolean;
  isLeaf?: boolean;
  children?: React.ReactNode;
}

const iconMap = {
  city: Building2,
  building: Building2,
  map: MapPin,
  thermometer: Thermometer,
};

const statusColorMap = {
  normal: 'text-green-600',
  warning: 'text-yellow-600', 
  critical: 'text-red-600',
};

export function TreeNode({ 
  id, 
  icon, 
  name, 
  makeupWater, 
  weeklyChange, 
  status, 
  actionType,
  isRoot = false,
  isLeaf = false,
  children 
}: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(isRoot || !isLeaf);

  const Icon = iconMap[icon];
  const hasChildren = !!children;

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'critical': return 'Критично';
      case 'warning': return 'Внимание';
      default: return 'Норма';
    }
  };

  const getBackgroundClass = (status: string) => {
    switch (status) {
      case 'critical': return 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800';
      case 'warning': return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800';
      default: return '';
    }
  };

  const toggleExpansion = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div className="space-y-1">
      <div 
        className={cn(
          "tree-node p-4 cursor-pointer transition-all",
          getBackgroundClass(status),
          isExpanded && hasChildren && "expanded"
        )}
        onClick={toggleExpansion}
        data-testid={`tree-node-${id}`}
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            {hasChildren && (
              <>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground transition-transform" />
                )}
              </>
            )}
            <Icon className={cn("w-5 h-5", statusColorMap[status])} />
            <span className={cn("font-medium", status === 'critical' && "font-bold")}>
              {name}
            </span>
          </div>
          
          <div className="flex gap-4 text-sm items-center">
            <span className="text-muted-foreground">
              Подпитка: 
              <strong 
                className={cn(
                  "font-mono ml-1",
                  status === 'critical' && "text-red-600 font-bold",
                  status === 'warning' && "text-yellow-600 font-semibold"
                )}
              >
                {makeupWater.toFixed(1)} т/ч
              </strong>
            </span>
            
            {weeklyChange !== undefined && (
              <span 
                className={cn(
                  "font-semibold",
                  weeklyChange < 0 ? "text-green-600" : "text-red-600"
                )}
              >
                Δ неделя: <strong>{weeklyChange > 0 ? '+' : ''}{weeklyChange.toFixed(1)} т/ч</strong>
              </span>
            )}
            
            <StatusBadge status={status}>
              {getStatusLabel(status)}
            </StatusBadge>

            {actionType && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  // Handle action click
                }}
                data-testid={`action-${id}`}
              >
                {actionType === 'Инспекция утечек' && <Search className="w-3 h-3 mr-1" />}
                {actionType === 'Мониторинг' && <Eye className="w-3 h-3 mr-1" />}
                {actionType === 'Проверка приборов' && <Settings className="w-3 h-3 mr-1" />}
                {actionType}
              </Button>
            )}
          </div>
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div className="tree-children ml-6 border-l-2 border-border pl-4">
          {children}
        </div>
      )}
    </div>
  );
}
