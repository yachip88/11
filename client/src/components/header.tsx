import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Download,
  RefreshCw,
  FileSpreadsheet,
  FileText,
  File,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function Header() {
  const { toast } = useToast();

  const handleRefresh = () => {
    toast({
      title: "Обновление данных",
      description: "Данные обновляются...",
    });
    // TODO: Implement actual refresh logic
    window.location.reload();
  };

  const handleExport = (format: string) => {
    toast({
      title: `Экспорт в ${format.toUpperCase()}`,
      description: "Экспорт будет реализован в следующих версиях",
    });
    // TODO: Implement export functionality
  };

  return (
    <header className="bg-card border-b border-border px-8 py-6 sticky top-0 z-30">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold mb-1">
            Аналитическая модель подпитки теплосетей
          </h2>
          <p className="text-muted-foreground text-sm">
            Новосибирская теплоснабжающая компания
          </p>
        </div>
        <div className="flex gap-4 items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" data-testid="button-export">
                <Download className="w-4 h-4 mr-2" />
                Экспорт
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport("excel")}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Экспорт в Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("pdf")}>
                <FileText className="w-4 h-4 mr-2" />
                Экспорт в PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("csv")}>
                <File className="w-4 h-4 mr-2" />
                Экспорт в CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={handleRefresh} data-testid="button-refresh">
            <RefreshCw className="w-4 h-4 mr-2" />
            Обновить
          </Button>
        </div>
      </div>
    </header>
  );
}
