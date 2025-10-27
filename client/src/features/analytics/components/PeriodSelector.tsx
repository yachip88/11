import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PeriodPreset } from "../types";
import { PERIOD_OPTIONS } from "../constants";

interface PeriodSelectorProps {
  value: PeriodPreset;
  onChange: (value: PeriodPreset) => void;
}

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <div className="space-y-1">
      <span className="text-xs text-muted-foreground uppercase tracking-wide">Период анализа</span>
      <Select value={value} onValueChange={(next) => onChange(next as PeriodPreset)}>
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PERIOD_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <div>
                <p className="font-medium">{option.label}</p>
                <p className="text-xs text-muted-foreground">{option.description}</p>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
