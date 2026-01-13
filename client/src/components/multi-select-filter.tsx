import { useState, useEffect } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface Option {
  value: string;
  label: string;
}

interface MultiSelectFilterProps {
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder: string;
  storageKey?: string;
  className?: string;
}

export function MultiSelectFilter({
  options,
  selected,
  onChange,
  placeholder,
  storageKey,
  className,
}: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (storageKey) {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            onChange(parsed);
          }
        } catch (e) {
        }
      }
    }
  }, [storageKey]);

  const handleToggle = (value: string) => {
    let newSelected: string[];
    if (selected.includes(value)) {
      newSelected = selected.filter((v) => v !== value);
    } else {
      newSelected = [...selected, value];
    }
    onChange(newSelected);
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(newSelected));
    }
  };

  const handleSelectAll = () => {
    const allValues = options.map((o) => o.value);
    onChange(allValues);
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(allValues));
    }
  };

  const handleClearAll = () => {
    onChange([]);
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify([]));
    }
  };

  const displayText = () => {
    if (selected.length === 0 || selected.length === options.length) {
      return placeholder;
    }
    if (selected.length === 1) {
      return options.find((o) => o.value === selected[0])?.label || placeholder;
    }
    return `${selected.length} ausgewählt`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between", className)}
          data-testid={`multiselect-${storageKey}`}
        >
          <span className="truncate">{displayText()}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <div className="flex gap-2 mb-2 border-b pb-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7 flex-1"
            onClick={handleSelectAll}
          >
            Alle
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7 flex-1"
            onClick={handleClearAll}
          >
            Keine
          </Button>
        </div>
        <div className="space-y-1 max-h-60 overflow-auto">
          {options.map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover-elevate"
            >
              <Checkbox
                checked={selected.includes(option.value)}
                onCheckedChange={() => handleToggle(option.value)}
                data-testid={`checkbox-${option.value}`}
              />
              <span className="text-sm">{option.label}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
